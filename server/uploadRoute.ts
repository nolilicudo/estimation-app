/**
 * Express multipart upload route for session file uploads.
 * POST /api/upload/session-file
 *
 * Accepts a multipart/form-data request with:
 *   - file: the file binary (PDF, image, etc.)
 *   - sessionToken: the questionnaire session token
 *   - questionId: (optional) the question ID this file belongs to
 *   - questionLabel: (optional) human-readable label from the question prompt
 *   - fileCategory: "project_plans" | "reference_photo" | "site_photo" | "other"
 *
 * Returns: { success: true, fileId, fileUrl, fileName, fileKey }
 */
import { Router, type Express } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { questionnaireSessions, questionnaireSessionFiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// Store file in memory (buffer) — we'll forward it to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 12);
}

function getExtension(mimeType: string, originalName: string): string {
  const extFromName = originalName.split(".").pop()?.toLowerCase();
  if (extFromName && extFromName.length <= 5) return extFromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[mimeType] ?? "bin";
}

export function registerUploadRoute(app: Express) {
  const router = Router();

  router.post(
    "/session-file",
    upload.single("file"),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "No file provided" });
          return;
        }

        const sessionToken = req.body.sessionToken as string | undefined;
        if (!sessionToken) {
          res.status(400).json({ error: "sessionToken is required" });
          return;
        }

        const questionId = req.body.questionId
          ? parseInt(req.body.questionId as string, 10)
          : null;
        const questionLabel = (req.body.questionLabel as string) || null;
        const fileCategory = (req.body.fileCategory as string) || "other";

        // Resolve session
        const db = await getDb();
        if (!db) { res.status(500).json({ error: "DB not available" }); return; }
        const [session] = await db
          .select({ id: questionnaireSessions.id })
          .from(questionnaireSessions)
          .where(eq(questionnaireSessions.sessionToken, sessionToken))
          .limit(1);

        if (!session) {
          res.status(404).json({ error: "Session not found" });
          return;
        }

        // Upload to S3
        const ext = getExtension(file.mimetype, file.originalname);
        const fileKey = `session-files/${sessionToken}/${questionId ?? "misc"}-${randomSuffix()}.${ext}`;
        const { url: fileUrl } = await storagePut(fileKey, file.buffer, file.mimetype);

        // Save metadata to DB
        const [inserted] = await db!
          .insert(questionnaireSessionFiles)
          .values({
            sessionId: session.id,
            questionId: questionId ?? undefined,
            fileKey,
            fileUrl,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileCategory,
            questionLabel: questionLabel ?? undefined,
          })
          .$returningId();

        res.json({
          success: true,
          fileId: inserted?.id ?? null,
          fileUrl,
          fileName: file.originalname,
          fileKey,
        });
      } catch (err: unknown) {
        console.error("[UploadRoute] Error:", err);
        const message = err instanceof Error ? err.message : "Upload failed";
        res.status(500).json({ error: message });
      }
    }
  );

  app.use("/api/upload", router);
}
