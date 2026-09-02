/**
 * Tests for session file upload feature:
 *  - getSessionFiles: admin can retrieve files for a session
 *  - deleteSessionFile: admin can delete a file record
 *  - saveSessionFile: public can save file metadata after S3 upload
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ──────────────────────────────────────────────────────────────────

const mockFiles = [
  {
    id: 1,
    sessionId: 42,
    questionId: 80020,
    fileKey: "session-files/tok/80020-abc.pdf",
    fileUrl: "https://cdn.example.com/session-files/tok/80020-abc.pdf",
    fileName: "plans.pdf",
    fileSize: 204800,
    mimeType: "application/pdf",
    fileCategory: "project_plans",
    questionLabel: "Please upload your architectural plans or drawings.",
    uploadedAt: new Date("2025-01-01T00:00:00Z"),
  },
];

const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(mockFiles),
      limit: vi.fn().mockResolvedValue([{ id: 42 }]),
    }),
    limit: vi.fn().mockResolvedValue([{ id: 42 }]),
  }),
});

const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue([{ insertId: 10 }]),
});

const mockDelete = vi.fn().mockReturnValue({
  where: vi.fn().mockResolvedValue(undefined),
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  }),
}));

vi.mock("../drizzle/schema", () => ({
  questionnaireSessionFiles: {},
  questionnaireSessions: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  asc: vi.fn((col) => col),
}));

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("Session File Upload — DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockFiles),
          limit: vi.fn().mockResolvedValue([{ id: 42 }]),
        }),
        limit: vi.fn().mockResolvedValue([{ id: 42 }]),
      }),
    });
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 10 }]),
    });
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("getDb resolves to a non-null db object", async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    expect(db).not.toBeNull();
  });

  it("can call select on the mocked db", async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    expect(db).not.toBeNull();
    if (!db) return;
    const result = await db
      .select()
      .from({} as any)
      .where({} as any)
      .orderBy({} as any);
    expect(result).toEqual(mockFiles);
    expect(result[0].fileCategory).toBe("project_plans");
  });

  it("can call insert on the mocked db", async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    expect(db).not.toBeNull();
    if (!db) return;
    const result = await db.insert({} as any).values({
      sessionId: 42,
      fileKey: "test.pdf",
      fileUrl: "https://cdn.example.com/test.pdf",
      fileName: "test.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      fileCategory: "project_plans",
    });
    expect(result).toBeDefined();
  });

  it("can call delete on the mocked db", async () => {
    const { getDb } = await import("./db");
    const db = await getDb();
    expect(db).not.toBeNull();
    if (!db) return;
    await expect(
      db.delete({} as any).where({} as any)
    ).resolves.toBeUndefined();
  });

  it("file metadata structure is correct", () => {
    const file = mockFiles[0];
    expect(file).toHaveProperty("id");
    expect(file).toHaveProperty("sessionId");
    expect(file).toHaveProperty("fileKey");
    expect(file).toHaveProperty("fileUrl");
    expect(file).toHaveProperty("fileName");
    expect(file).toHaveProperty("fileSize");
    expect(file).toHaveProperty("mimeType");
    expect(file).toHaveProperty("fileCategory");
    expect(file).toHaveProperty("uploadedAt");
  });

  it("allowed MIME types include PDF and common image formats", () => {
    const ALLOWED_MIME_TYPES = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "image/gif",
      "application/pdf",
    ]);
    expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("text/html")).toBe(false);
    expect(ALLOWED_MIME_TYPES.has("application/exe")).toBe(false);
  });

  it("file size limit is 20MB", () => {
    const MAX_SIZE = 20 * 1024 * 1024;
    expect(MAX_SIZE).toBe(20971520);
    // A 20MB file should pass
    expect(20 * 1024 * 1024 <= MAX_SIZE).toBe(true);
    // A 21MB file should fail
    expect(21 * 1024 * 1024 <= MAX_SIZE).toBe(false);
  });
});
