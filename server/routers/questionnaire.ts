/**
 * Rough Pricing Questionnaire Router
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  roughQuestionnaireSubmissions,
  roughQuestionnaireRooms,
  roughQuestionnaireTradeSelections,
  roughInspirationPhotos,
  questionnaireQuestions,
  questionnaireOptions,
  questionnairePriceRules,
  questionnaireSessions,
  questionnaireAnswers,
  questionnairePricingTierMultipliers,
  questionnairePricingAddons,
  dpCatalogItems,
  dpPricingRules,
  type RoughQuestionnaireSubmission,
  type RoughInspirationPhoto,
  type RoughQuestionnaireTradeSelection,
  type QuestionnaireQuestion,
  type QuestionnaireOption,
  type QuestionnairePriceRule,
  type QuestionnaireSession,
  type QuestionnairePricingTierMultiplier,
  type QuestionnairePricingAddon,
  type DpCatalogItem,
  type DpPricingRule,
  dpCabinetPricing,
  type DpCabinetPricing,
  questionnaireSessionFiles,
  type QuestionnaireSessionFile,
} from "../../drizzle/schema";
import { computeRoughPricing } from "../questionnaire-pricing-engine";
import { eq, desc, like, or, asc } from "drizzle-orm";

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

const GHL_BASE = "https://services.leadconnectorhq.com";

async function ghlUpsertContactSimple(
  apiKey: string,
  locationId: string,
  data: { customerName: string; customerEmail: string; customerPhone: string; customerAddress?: string }
): Promise<string | null> {
  try {
    const nameParts = data.customerName.trim().split(" ");
    const firstName = nameParts[0] || data.customerName;
    const lastName = nameParts.slice(1).join(" ") || "";
    const body: Record<string, unknown> = {
      locationId,
      firstName,
      lastName,
      email: data.customerEmail,
      phone: data.customerPhone || undefined,
      address1: data.customerAddress || undefined,
      source: "Design Your Price Questionnaire",
      tags: ["questionnaire"],
    };
    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Version: "2021-04-15" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) { console.error("[questionnaire] GHL upsert failed:", res.status, json); return null; }
    const contact = json?.contact as Record<string, unknown> | undefined;
    return (contact?.id as string) ?? (json?.id as string) ?? null;
  } catch (err) {
    console.error("[questionnaire] GHL upsert error:", err);
    return null;
  }
}

async function ghlSendMessage(
  apiKey: string,
  locationId: string,
  contactId: string,
  data: { customerEmail: string; customerPhone: string; customerName: string; questionnaireUrl: string; emailHtml: string; type: "email" | "sms" }
): Promise<void> {
  const body = data.type === "email"
    ? { type: "Email", contactId, subject: "Your Design Questionnaire — Design Your Price", emailFrom: `noreply@${locationId}.mailgun.org`, emailTo: data.customerEmail, html: data.emailHtml }
    : { type: "SMS", contactId, message: `Hi ${data.customerName}! Your Design Your Price questionnaire is ready: ${data.questionnaireUrl}` };
  const res = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Version: "2021-04-15" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    console.error(`[questionnaire] GHL ${data.type} send failed:`, res.status, json);
  }
}

function buildEmailHtml(customerName: string, questionnaireUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f2ee;font-family:Georgia,serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#5a3e2b 0%,#8B4513 100%);padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Design Your Price</h1>
    <p style="margin:8px 0 0;color:#f5d9c0;font-size:14px;">Rough Pricing Questionnaire</p>
  </div>
  <div style="padding:32px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#3a2a1a;">Hi ${customerName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#5a4a3a;line-height:1.6;">Your design consultant has prepared a personalized questionnaire to help us understand your project goals and provide you with an accurate rough pricing estimate.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#5a4a3a;line-height:1.6;">The questionnaire takes about 5–10 minutes to complete. Your answers will be saved and reviewed by our team before your consultation.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${questionnaireUrl}" style="display:inline-block;background:#8B4513;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;">Start My Questionnaire →</a>
    </div>
    <p style="margin:0;font-size:13px;color:#9a8a7a;text-align:center;">Or copy this link: <a href="${questionnaireUrl}" style="color:#8B4513;">${questionnaireUrl}</a></p>
  </div>
  <div style="background:#f5f2ee;padding:20px 40px;text-align:center;border-top:1px solid #e8e2da;">
    <p style="margin:0;font-size:12px;color:#9a8a7a;">Design Your Price · Orem, Utah</p>
  </div>
</div></body></html>`;
}

function formatCurrencyServer(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── calculation rule helpers ─────────────────────────────────────────────────

/**
 * Evaluate whether a calculation rule condition matches the given answer value.
 * conditionType: "always_apply" | "equals" | "greater_than" | "less_than" | "between" | "contains"
 */
function evaluateCondition(
  conditionType: string,
  conditionValue: string | number | [number, number] | undefined,
  answerValue: string | number | string[]
): boolean {
  if (conditionType === "always_apply") return true;

  const strAnswer = Array.isArray(answerValue) ? answerValue.join(", ") : String(answerValue);
  const numAnswer = typeof answerValue === "number" ? answerValue : parseFloat(String(answerValue));

  switch (conditionType) {
    case "equals":
      if (conditionValue === undefined) return false;
      // Case-insensitive string comparison or numeric comparison
      if (typeof conditionValue === "string") return strAnswer.toLowerCase() === conditionValue.toLowerCase();
      if (typeof conditionValue === "number") return numAnswer === conditionValue;
      return false;

    case "greater_than":
      if (typeof conditionValue !== "number" || isNaN(numAnswer)) return false;
      return numAnswer > conditionValue;

    case "less_than":
      if (typeof conditionValue !== "number" || isNaN(numAnswer)) return false;
      return numAnswer < conditionValue;

    case "between": {
      if (!Array.isArray(conditionValue) || conditionValue.length !== 2 || isNaN(numAnswer)) return false;
      const [min, max] = conditionValue;
      return numAnswer >= min && numAnswer <= max;
    }

    case "contains":
      if (typeof conditionValue !== "string") return false;
      // Check if the answer string contains the condition value (case-insensitive)
      if (Array.isArray(answerValue)) return answerValue.some(v => v.toLowerCase().includes(conditionValue.toLowerCase()));
      return strAnswer.toLowerCase().includes(conditionValue.toLowerCase());

    default:
      return false;
  }
}

/**
 * Evaluate a simple formula string using variables: answer, sqft, room_sqft.
 * Supports basic arithmetic: +, -, *, /, and parentheses.
 * Example: "answer * 15" or "sqft * 2.5 + 500"
 */
function evaluateFormula(formula: string, answer: number, sqft: number, room_sqft: number): number {
  // Replace variable names with their numeric values
  let expr = formula
    .replace(/\banswer\b/g, String(answer))
    .replace(/\broom_sqft\b/g, String(room_sqft))
    .replace(/\bsqft\b/g, String(sqft));

  // Sanitize: only allow digits, decimal points, arithmetic operators, parentheses, spaces
  if (!/^[\d.+\-*/() ]+$/.test(expr)) {
    throw new Error(`Invalid formula expression: ${expr}`);
  }

  // Use Function constructor for safe arithmetic evaluation
  const result = new Function(`"use strict"; return (${expr});`)();
  return typeof result === "number" && isFinite(result) ? result : 0;
}

// ─── router ───────────────────────────────────────────────────────────────────

export const questionnaireRouter = router({
  // ── Admin: send questionnaire link to homeowner ──────────────────────────
  send: adminProcedure
    .input(z.object({
      customerName: z.string().min(1),
      customerEmail: z.string().email(),
      customerPhone: z.string().min(7),
      customerAddress: z.string().optional().default(""),
      origin: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { ENV } = await import("../_core/env");
      const token = generateToken();
      const d = await getDb();
      if (!d) throw new Error("Database not available");

      await d.insert(roughQuestionnaireSubmissions).values({
        token,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress || null,
        status: "sent",
      });

      const questionnaireUrl = `${input.origin}/questionnaire/${token}`;

      if (ENV.ghlApiKey && ENV.ghlLocationId) {
        try {
          const contactId = await ghlUpsertContactSimple(ENV.ghlApiKey, ENV.ghlLocationId, {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            customerAddress: input.customerAddress,
          });
          if (contactId) {
            const emailHtml = buildEmailHtml(input.customerName, questionnaireUrl);
            await ghlSendMessage(ENV.ghlApiKey, ENV.ghlLocationId, contactId, { customerEmail: input.customerEmail, customerPhone: input.customerPhone, customerName: input.customerName, questionnaireUrl, emailHtml, type: "email" });
            await ghlSendMessage(ENV.ghlApiKey, ENV.ghlLocationId, contactId, { customerEmail: input.customerEmail, customerPhone: input.customerPhone, customerName: input.customerName, questionnaireUrl, emailHtml, type: "sms" });
          }
        } catch (err) {
          console.error("[questionnaire.send] GHL error:", err);
        }
      }

      return { success: true, token, questionnaireUrl };
    }),

  // ── Public: get questionnaire by token ──────────────────────────────────
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const rows = await d.select().from(roughQuestionnaireSubmissions).where(eq(roughQuestionnaireSubmissions.token, input.token)).limit(1);
      if (!rows.length) return null;
      const submission = rows[0];
      const rooms = await d.select().from(roughQuestionnaireRooms).where(eq(roughQuestionnaireRooms.submissionId, submission.id));
      const trades = await d.select().from(roughQuestionnaireTradeSelections).where(eq(roughQuestionnaireTradeSelections.submissionId, submission.id));
      return { submission, rooms, trades };
    }),

  // ── Public: submit questionnaire answers ────────────────────────────────
  submit: publicProcedure
    .input(z.object({
      token: z.string(),
      mode: z.enum(["know", "help"]),
      rooms: z.array(z.object({ roomKey: z.string(), details: z.record(z.string(), z.unknown()).optional() })),
      trades: z.array(z.object({ tradeKey: z.string(), selectedPhotoIds: z.array(z.number()).optional(), notes: z.string().optional() })).optional().default([]),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const rows = await d.select({ id: roughQuestionnaireSubmissions.id }).from(roughQuestionnaireSubmissions).where(eq(roughQuestionnaireSubmissions.token, input.token)).limit(1);
      if (!rows.length) throw new Error("Invalid questionnaire token");
      const { id: submissionId } = rows[0];

      await d.delete(roughQuestionnaireRooms).where(eq(roughQuestionnaireRooms.submissionId, submissionId));
      await d.delete(roughQuestionnaireTradeSelections).where(eq(roughQuestionnaireTradeSelections.submissionId, submissionId));

      if (input.rooms.length > 0) {
        await d.insert(roughQuestionnaireRooms).values(input.rooms.map((r) => ({ submissionId, roomKey: r.roomKey, details: r.details ?? null })));
      }
      if (input.trades.length > 0) {
        await d.insert(roughQuestionnaireTradeSelections).values(input.trades.map((t) => ({ submissionId, tradeKey: t.tradeKey, selectedPhotoIds: t.selectedPhotoIds ?? null, notes: t.notes ?? null })));
      }

      await d.update(roughQuestionnaireSubmissions).set({ mode: input.mode, status: "completed", completedAt: new Date() }).where(eq(roughQuestionnaireSubmissions.id, submissionId));
      return { success: true };
    }),

  // ── Calculator: lookup by phone number ──────────────────────────────────
  getByPhone: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const normalized = normalizePhone(input.phone);
      const rows = await d.select().from(roughQuestionnaireSubmissions)
        .where(or(eq(roughQuestionnaireSubmissions.customerPhone, input.phone), like(roughQuestionnaireSubmissions.customerPhone, `%${normalized.slice(-10)}`)))
        .orderBy(desc(roughQuestionnaireSubmissions.createdAt))
        .limit(5);
      if (!rows.length) return null;
      const completed = rows.find((r: RoughQuestionnaireSubmission) => r.status === "completed");
      const submission = completed ?? rows[0];
      const rooms = await d.select().from(roughQuestionnaireRooms).where(eq(roughQuestionnaireRooms.submissionId, submission.id));
      const trades = await d.select().from(roughQuestionnaireTradeSelections).where(eq(roughQuestionnaireTradeSelections.submissionId, submission.id));
      return { submission, rooms, trades };
    }),

  // ── Admin: list all submissions ──────────────────────────────────────────
  listSubmissions: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50), offset: z.number().min(0).default(0), search: z.string().optional() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      const rows = await d.select().from(roughQuestionnaireSubmissions).orderBy(desc(roughQuestionnaireSubmissions.createdAt)).limit(input.limit).offset(input.offset);
      if (input.search) {
        const s = input.search.toLowerCase();
        return rows.filter((r: RoughQuestionnaireSubmission) => r.customerName.toLowerCase().includes(s) || r.customerEmail.toLowerCase().includes(s) || r.customerPhone.includes(s));
      }
      return rows;
    }),

  // ── Admin: get full submission details ──────────────────────────────────
  getSubmission: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const rows = await d.select().from(roughQuestionnaireSubmissions).where(eq(roughQuestionnaireSubmissions.id, input.id)).limit(1);
      if (!rows.length) return null;
      const submission = rows[0];
      const rooms = await d.select().from(roughQuestionnaireRooms).where(eq(roughQuestionnaireRooms.submissionId, submission.id));
      const trades = await d.select().from(roughQuestionnaireTradeSelections).where(eq(roughQuestionnaireTradeSelections.submissionId, submission.id));
      const allPhotoIds = trades.flatMap((t: RoughQuestionnaireTradeSelection) => (t.selectedPhotoIds as number[]) ?? []);
      let photos: RoughInspirationPhoto[] = [];
      if (allPhotoIds.length > 0) {
        const allPhotos = await d.select().from(roughInspirationPhotos);
        photos = allPhotos.filter((p: RoughInspirationPhoto) => allPhotoIds.includes(p.id));
      }
      return { submission, rooms, trades, photos };
    }),

  // ── Admin: update notes ──────────────────────────────────────────────────
  updateNotes: adminProcedure
    .input(z.object({ id: z.number(), notes: z.string() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.update(roughQuestionnaireSubmissions).set({ notes: input.notes }).where(eq(roughQuestionnaireSubmissions.id, input.id));
      return { success: true };
    }),

  // ── Admin: delete a submission ───────────────────────────────────────────
  deleteSubmission: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.delete(roughQuestionnaireRooms).where(eq(roughQuestionnaireRooms.submissionId, input.id));
      await d.delete(roughQuestionnaireTradeSelections).where(eq(roughQuestionnaireTradeSelections.submissionId, input.id));
      await d.delete(roughQuestionnaireSubmissions).where(eq(roughQuestionnaireSubmissions.id, input.id));
      return { success: true };
    }),

  // ── Admin: resend questionnaire link ────────────────────────────────────
  resend: adminProcedure
    .input(z.object({ id: z.number(), origin: z.string().url() }))
    .mutation(async ({ input }) => {
      const { ENV } = await import("../_core/env");
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const rows = await d.select().from(roughQuestionnaireSubmissions).where(eq(roughQuestionnaireSubmissions.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Submission not found");
      const sub = rows[0];
      const questionnaireUrl = `${input.origin}/questionnaire/${sub.token}`;
      if (ENV.ghlApiKey && ENV.ghlLocationId) {
        try {
          const contactId = await ghlUpsertContactSimple(ENV.ghlApiKey, ENV.ghlLocationId, { customerName: sub.customerName, customerEmail: sub.customerEmail, customerPhone: sub.customerPhone, customerAddress: sub.customerAddress || "" });
          if (contactId) {
            const emailHtml = buildEmailHtml(sub.customerName, questionnaireUrl);
            await ghlSendMessage(ENV.ghlApiKey, ENV.ghlLocationId, contactId, { customerEmail: sub.customerEmail, customerPhone: sub.customerPhone, customerName: sub.customerName, questionnaireUrl, emailHtml, type: "email" });
            await ghlSendMessage(ENV.ghlApiKey, ENV.ghlLocationId, contactId, { customerEmail: sub.customerEmail, customerPhone: sub.customerPhone, customerName: sub.customerName, questionnaireUrl, emailHtml, type: "sms" });
          }
        } catch (err) {
          console.error("[questionnaire.resend] GHL error:", err);
        }
      }
      return { success: true, questionnaireUrl };
    }),

  // ── Admin: inspiration photos CRUD ──────────────────────────────────────
  listPhotos: adminProcedure
    .input(z.object({ tradeKey: z.string().optional() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      let rows = await d.select().from(roughInspirationPhotos).orderBy(asc(roughInspirationPhotos.tradeKey), asc(roughInspirationPhotos.sortOrder));
      if (input.tradeKey) rows = rows.filter((r: RoughInspirationPhoto) => r.tradeKey === input.tradeKey);
      return rows;
    }),

  getActivePhotos: publicProcedure
    .input(z.object({ tradeKey: z.string().optional() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return [];
      let rows = await d.select().from(roughInspirationPhotos).where(eq(roughInspirationPhotos.isActive, 1)).orderBy(asc(roughInspirationPhotos.tradeKey), asc(roughInspirationPhotos.sortOrder));
      if (input.tradeKey) rows = rows.filter((r: RoughInspirationPhoto) => r.tradeKey === input.tradeKey);
      return rows;
    }),

  addPhoto: adminProcedure
    .input(z.object({ tradeKey: z.string(), photoBase64: z.string(), mimeType: z.string().default("image/jpeg"), title: z.string().default(""), subtitle: z.string().default(""), sortOrder: z.number().default(0) }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const buffer = Buffer.from(input.photoBase64, "base64");
      const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const fileKey = `questionnaire-photos/${input.tradeKey}/${randomSuffix}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const [result] = await d.insert(roughInspirationPhotos).values({ tradeKey: input.tradeKey, photoUrl: url, title: input.title, subtitle: input.subtitle, sortOrder: input.sortOrder, isActive: 1 });
      const header = result as unknown as { insertId: number };
      return { success: true, url, id: header.insertId };
    }),

  updatePhoto: adminProcedure
    .input(z.object({ id: z.number(), title: z.string().optional(), subtitle: z.string().optional(), sortOrder: z.number().optional(), isActive: z.number().optional(), tradeKey: z.string().optional() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const { id, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      if (Object.keys(filtered).length > 0) {
        await d.update(roughInspirationPhotos).set(filtered).where(eq(roughInspirationPhotos.id, id));
      }
      return { success: true };
    }),

  deletePhoto: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.delete(roughInspirationPhotos).where(eq(roughInspirationPhotos.id, input.id));
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // DYNAMIC QUESTIONNAIRE BUILDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── Admin: Questions CRUD ─────────────────────────────────────────────────
  listQuestions: adminProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    const questions = await d.select().from(questionnaireQuestions).orderBy(asc(questionnaireQuestions.sortOrder), asc(questionnaireQuestions.id));
    const options = await d.select().from(questionnaireOptions).orderBy(asc(questionnaireOptions.sortOrder), asc(questionnaireOptions.id));
    return questions.map((q: QuestionnaireQuestion) => ({
      ...q,
      options: options.filter((o: QuestionnaireOption) => o.questionId === q.id),
    }));
  }),

  getPublicQuestions: publicProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    const questions = await d.select().from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.isActive, 1))
      .orderBy(asc(questionnaireQuestions.sortOrder), asc(questionnaireQuestions.id));
    const options = await d.select().from(questionnaireOptions).orderBy(asc(questionnaireOptions.sortOrder), asc(questionnaireOptions.id));
    return questions.map((q: QuestionnaireQuestion) => ({
      ...q,
      options: options.filter((o: QuestionnaireOption) => o.questionId === q.id),
    }));
  }),

  createQuestion: adminProcedure
    .input(z.object({
      text: z.string().min(1),
      subtext: z.string().optional().default(""),
      type: z.enum(["single", "multi", "quantity_select", "voice_photo", "photo_upload"]).default("single"),
      inputType: z.string().default("options"),
      dropdownOptions: z.array(z.string()).optional(),
      imageUrl: z.string().optional().default(""),
      sortOrder: z.number().default(0),
      calculationRules: z.array(z.object({
        name: z.string(),
        conditionType: z.enum(["always_apply", "equals", "greater_than", "less_than", "between", "contains"]),
        conditionValue: z.union([z.string(), z.number(), z.tuple([z.number(), z.number()])]).optional(),
        fixedCost: z.number().optional(),
        formula: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
      tradeCategory: z.string().optional(),
      displayOrder: z.number().optional(),
      section: z.string().optional(),
      parentQuestionId: z.number().nullable().optional(),
      parentOptionId: z.number().nullable().optional(),
      applicableProjectTypes: z.array(z.enum(["bathroom", "kitchen", "addition", "basement"])).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const [result] = await d.insert(questionnaireQuestions).values({
        text: input.text,
        subtext: input.subtext || null,
        type: input.type,
        inputType: input.inputType,
        dropdownOptions: input.dropdownOptions ?? null,
        imageUrl: input.imageUrl || null,
        sortOrder: input.sortOrder,
        isActive: 1,
        calculationRules: input.calculationRules ?? null,
        tradeCategory: input.tradeCategory ?? null,
        displayOrder: input.displayOrder != null ? String(input.displayOrder) : null,
        section: input.section ?? null,
        parentQuestionId: input.parentQuestionId ?? null,
        parentOptionId: input.parentOptionId ?? null,
        applicableProjectTypes: input.applicableProjectTypes ?? null,
      });
      const header = result as unknown as { insertId: number };
      return { success: true, id: header.insertId };
    }),

  updateQuestion: adminProcedure
    .input(z.object({
      id: z.number(),
      text: z.string().min(1).optional(),
      subtext: z.string().optional(),
      type: z.enum(["single", "multi", "quantity_select", "voice_photo", "photo_upload"]).optional(),
      inputType: z.string().optional(),
      dropdownOptions: z.array(z.string()).nullable().optional(),
      imageUrl: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.number().optional(),
      calculationRules: z.array(z.object({
        name: z.string(),
        conditionType: z.enum(["always_apply", "equals", "greater_than", "less_than", "between", "contains"]),
        conditionValue: z.union([z.string(), z.number(), z.tuple([z.number(), z.number()])]).optional(),
        fixedCost: z.number().optional(),
        formula: z.string().optional(),
        description: z.string().optional(),
      })).nullable().optional(),
      tradeCategory: z.string().nullable().optional(),
      displayOrder: z.number().nullable().optional(),
      section: z.string().nullable().optional(),
      parentQuestionId: z.number().nullable().optional(),
      parentOptionId: z.number().nullable().optional(),
      applicableProjectTypes: z.array(z.enum(["bathroom", "kitchen", "addition", "basement"])).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const { id, displayOrder, ...rest } = input;
      const updates: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      if (displayOrder !== undefined) updates.displayOrder = displayOrder != null ? String(displayOrder) : null;
      if (Object.keys(updates).length > 0) {
        await d.update(questionnaireQuestions).set(updates).where(eq(questionnaireQuestions.id, id));
      }
      return { success: true };
    }),

  deleteQuestion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      // Delete child questions that branch from this one
      await d.delete(questionnaireQuestions).where(eq(questionnaireQuestions.parentQuestionId, input.id));
      // Delete options
      await d.delete(questionnaireOptions).where(eq(questionnaireOptions.questionId, input.id));
      // Delete the question itself
      await d.delete(questionnaireQuestions).where(eq(questionnaireQuestions.id, input.id));
      return { success: true };
    }),

  reorderQuestions: adminProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      for (const item of input) {
        await d.update(questionnaireQuestions).set({ sortOrder: item.sortOrder }).where(eq(questionnaireQuestions.id, item.id));
      }
      return { success: true };
    }),

  // ── Admin: Options CRUD ───────────────────────────────────────────────────
  createOption: adminProcedure
    .input(z.object({
      questionId: z.number(),
      text: z.string().min(1),
      subtext: z.string().optional().default(""),
      imageUrl: z.string().optional().default(""),
      sortOrder: z.number().default(0),
      priceAdjustment: z.number().default(0),
      priceAdjustmentType: z.enum(["flat", "percent", "none"]).default("none"),
      pricingTier: z.number().min(1).max(5).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const [result] = await d.insert(questionnaireOptions).values({
        questionId: input.questionId,
        text: input.text,
        subtext: input.subtext || null,
        imageUrl: input.imageUrl || null,
        sortOrder: input.sortOrder,
        priceAdjustment: String(input.priceAdjustment),
        priceAdjustmentType: input.priceAdjustmentType,
        pricingTier: input.pricingTier ?? null,
      });
      const header = result as unknown as { insertId: number };
      return { success: true, id: header.insertId };
    }),

  updateOption: adminProcedure
    .input(z.object({
      id: z.number(),
      text: z.string().min(1).optional(),
      subtext: z.string().optional(),
      imageUrl: z.string().optional(),
      sortOrder: z.number().optional(),
      priceAdjustment: z.number().optional(),
      priceAdjustmentType: z.enum(["flat", "percent", "none"]).optional(),
      pricingTier: z.number().min(1).max(5).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const { id, priceAdjustment, ...rest } = input;
      const updates: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      if (priceAdjustment !== undefined) updates.priceAdjustment = String(priceAdjustment);
      if (Object.keys(updates).length > 0) {
        await d.update(questionnaireOptions).set(updates).where(eq(questionnaireOptions.id, id));
      }
      return { success: true };
    }),

  deleteOption: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      // Remove any questions that branch from this option
      await d.delete(questionnaireQuestions).where(eq(questionnaireQuestions.parentOptionId, input.id));
      await d.delete(questionnaireOptions).where(eq(questionnaireOptions.id, input.id));
      return { success: true };
    }),

  uploadOptionImage: adminProcedure
    .input(z.object({ imageBase64: z.string(), mimeType: z.string().default("image/jpeg") }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.imageBase64, "base64");
      const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const fileKey = `questionnaire-options/${randomSuffix}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { success: true, url };
    }),

  // ── Admin: Price Rules CRUD ───────────────────────────────────────────────
  listPriceRules: adminProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    return d.select().from(questionnairePriceRules).orderBy(asc(questionnairePriceRules.sortOrder), asc(questionnairePriceRules.id));
  }),

  createPriceRule: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      baseMin: z.number().min(0),
      baseMax: z.number().min(0),
      conditions: z.array(z.object({ questionId: z.number(), optionIds: z.array(z.number()) })).default([]),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const [result] = await d.insert(questionnairePriceRules).values({
        name: input.name,
        baseMin: String(input.baseMin),
        baseMax: String(input.baseMax),
        conditions: input.conditions,
        sortOrder: input.sortOrder,
        isActive: 1,
      });
      const header = result as unknown as { insertId: number };
      return { success: true, id: header.insertId };
    }),

  updatePriceRule: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      baseMin: z.number().min(0).optional(),
      baseMax: z.number().min(0).optional(),
      conditions: z.array(z.object({ questionId: z.number(), optionIds: z.array(z.number()) })).optional(),
      sortOrder: z.number().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const { id, baseMin, baseMax, ...rest } = input;
      const updates: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      if (baseMin !== undefined) updates.baseMin = String(baseMin);
      if (baseMax !== undefined) updates.baseMax = String(baseMax);
      if (Object.keys(updates).length > 0) {
        await d.update(questionnairePriceRules).set(updates).where(eq(questionnairePriceRules.id, id));
      }
      return { success: true };
    }),

  deletePriceRule: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.delete(questionnairePriceRules).where(eq(questionnairePriceRules.id, input.id));
      return { success: true };
    }),

  // ── Admin: Sessions (sent questionnaires) ─────────────────────────────────
  createSession: adminProcedure
    .input(z.object({
      customerName: z.string().optional().default(""),
      customerPhone: z.string().optional().default(""),
      customerEmail: z.string().optional().default(""),
      salesRepName: z.string().optional().default(""),
      notes: z.string().optional().default(""),
      origin: z.string().url(),
      projectType: z.enum(["bathroom", "kitchen", "addition", "basement"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { ENV } = await import("../_core/env");
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const token = generateToken();
      const [result] = await d.insert(questionnaireSessions).values({
        sessionToken: token,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        customerEmail: input.customerEmail || null,
        salesRepName: input.salesRepName || null,
        notes: input.notes || null,
        projectType: input.projectType ?? null,
      });
      const header = result as unknown as { insertId: number };
      const questionnaireUrl = `${input.origin}/q/${token}`;

      // Send via GHL if configured
      if (input.customerEmail && input.customerName && ENV.ghlApiKey && ENV.ghlLocationId) {
        try {
          const contactId = await ghlUpsertContactSimple(ENV.ghlApiKey, ENV.ghlLocationId, {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
          });
          if (contactId) {
            const emailHtml = buildEmailHtml(input.customerName, questionnaireUrl);
            await ghlSendMessage(ENV.ghlApiKey, ENV.ghlLocationId, contactId, {
              customerEmail: input.customerEmail,
              customerPhone: input.customerPhone,
              customerName: input.customerName,
              questionnaireUrl,
              emailHtml,
              type: "email",
            });
            if (input.customerPhone) {
              await ghlSendMessage(ENV.ghlApiKey, ENV.ghlLocationId, contactId, {
                customerEmail: input.customerEmail,
                customerPhone: input.customerPhone,
                customerName: input.customerName,
                questionnaireUrl,
                emailHtml,
                type: "sms",
              });
            }
          }
        } catch (err) {
          console.error("[questionnaire.createSession] GHL error:", err);
        }
      }

      return { success: true, id: header.insertId, token, questionnaireUrl };
    }),

  listSessions: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return { sessions: [], total: 0 };
      let rows = await d.select().from(questionnaireSessions)
        .orderBy(desc(questionnaireSessions.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      if (input.search) {
        const s = input.search.toLowerCase();
        rows = rows.filter((r: QuestionnaireSession) =>
          (r.customerName ?? "").toLowerCase().includes(s) ||
          (r.customerPhone ?? "").includes(s) ||
          (r.customerEmail ?? "").toLowerCase().includes(s)
        );
      }
      return { sessions: rows, total: rows.length };
    }),

  getSession: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const rows = await d.select().from(questionnaireSessions)
        .where(eq(questionnaireSessions.sessionToken, input.token))
        .limit(1);
      if (!rows.length) return null;
      return rows[0];
    }),

  // ── Public: Get session with all questions and options (for customer-facing flow) ──
  getSessionByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const rows = await d.select().from(questionnaireSessions)
        .where(eq(questionnaireSessions.sessionToken, input.token))
        .limit(1);
      if (!rows.length) return null;
      const session = rows[0];
      // Load all active questions with their options
      const questions = await d.select().from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.isActive, 1))
        .orderBy(asc(questionnaireQuestions.sortOrder));
      const options = await d.select().from(questionnaireOptions)
        .orderBy(asc(questionnaireOptions.sortOrder));
      // Attach options to questions
      const questionsWithOptions = questions.map(q => ({
        ...q,
        options: options.filter(o => o.questionId === q.id),
      }));
      return { session, questions: questionsWithOptions };
    }),

  getSessionById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const sessions = await d.select().from(questionnaireSessions)
        .where(eq(questionnaireSessions.id, input.id))
        .limit(1);
      if (!sessions.length) return null;
      const session = sessions[0];
      const answers = await d.select().from(questionnaireAnswers)
        .where(eq(questionnaireAnswers.sessionId, session.id));
      const questions = await d.select().from(questionnaireQuestions).orderBy(asc(questionnaireQuestions.sortOrder));
      const options = await d.select().from(questionnaireOptions).orderBy(asc(questionnaireOptions.sortOrder));
      return { session, answers, questions, options };
    }),

  deleteSession: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.delete(questionnaireAnswers).where(eq(questionnaireAnswers.sessionId, input.id));
      await d.delete(questionnaireSessions).where(eq(questionnaireSessions.id, input.id));
      return { success: true };
    }),

  // ── Public: Upload photo for voice_photo question ─────────────────────────
  uploadQuestionnairePhoto: publicProcedure
    .input(z.object({
      photoBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.photoBase64, "base64");
      const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 12);
      const fileKey = `questionnaire-customer-photos/${randomSuffix}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { success: true, url };
    }),

  // ── Public: Transcribe voice recording for voice_photo question ────────────
  transcribeQuestionnaireVoice: publicProcedure
    .input(z.object({
      audioUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { transcribeAudio } = await import("../_core/voiceTranscription");
      const result = await transcribeAudio({ audioUrl: input.audioUrl, language: "en" });
      if ("error" in result) {
        // Return empty text on error rather than throwing, so the customer flow isn't blocked
        return { success: false, text: "" };
      }
      return { success: true, text: result.text ?? "" };
    }),

  // ── Public: Submit answers and compute rough estimate ─────────────────────
  submitAnswers: publicProcedure
    .input(z.object({
      token: z.string(),
      answers: z.array(z.object({
        questionId: z.number(),
        selectedOptionIds: z.array(z.number()),
        /** For quantity_select: map of optionId (string key) → quantity */
        quantities: z.record(z.string(), z.number()).optional(),
        /** For voice_photo: transcribed text */
        voiceTranscription: z.string().optional(),
        /** For voice_photo: S3 URLs of uploaded photos */
        photoUrls: z.array(z.string()).optional(),
        /** For non-option input types (yes_no, number, dropdown, checkboxes, text): the raw answer value */
        freeformValue: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
      })),
      /** Optional: total project sqft for formula evaluation */
      sqft: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");

      // Find session
      const sessions = await d.select().from(questionnaireSessions)
        .where(eq(questionnaireSessions.sessionToken, input.token))
        .limit(1);
      if (!sessions.length) throw new Error("Invalid questionnaire link");
      const session = sessions[0];

      // Mark session as completed
      await d.update(questionnaireSessions).set({
        completedAt: new Date(),
      }).where(eq(questionnaireSessions.id, session.id));

      // Delete old answers and insert new ones
      await d.delete(questionnaireAnswers).where(eq(questionnaireAnswers.sessionId, session.id));
      if (input.answers.length > 0) {
        // Load questions to get photoCategory for photo_upload questions
        const questionsForAnswers = await d.select().from(questionnaireQuestions);
        const questionMap = new Map(questionsForAnswers.map(q => [q.id, q]));
        await d.insert(questionnaireAnswers).values(
          input.answers.map(a => ({
            sessionId: session.id,
            questionId: a.questionId,
            selectedOptionIds: a.selectedOptionIds,
            freeformValue: a.freeformValue !== undefined ? String(a.freeformValue) : null,
            quantities: a.quantities ?? null,
            voiceTranscription: a.voiceTranscription ?? null,
            photoUrls: a.photoUrls ?? null,
            photoCategory: questionMap.get(a.questionId)?.tradeCategory ?? null,
          }))
        );
      }

      // Compute rough estimate using the pricing engine
      const allRules = await d.select().from(questionnairePriceRules)
        .where(eq(questionnairePriceRules.isActive, 1))
        .orderBy(asc(questionnairePriceRules.sortOrder));
      const allOptions = await d.select().from(questionnaireOptions);
      const allQuestions = await d.select().from(questionnaireQuestions);
      const allTierMultipliers = await d.select().from(questionnairePricingTierMultipliers);
      const allPricingAddons = await d.select().from(questionnairePricingAddons)
        .where(eq(questionnairePricingAddons.isActive, 1));

      // Load catalog-based pricing (Layer 0)
      const allCatalogItems = await d.select().from(dpCatalogItems)
        .where(eq(dpCatalogItems.isActive, 1));
      const allDpPricingRules = await d.select().from(dpPricingRules)
        .where(eq(dpPricingRules.isActive, 1))
        .orderBy(asc(dpPricingRules.sortOrder));

      // Extract knowledge path from Section 0 answer (question 80001)
      const KNOWLEDGE_QUESTION_ID = 80001;
      const KNOWLEDGE_OPTION_MAP: Record<number, "help_me_figure_out" | "i_know_what_i_want" | "i_have_plans"> = {
        800011: "help_me_figure_out",
        800012: "i_know_what_i_want",
        800013: "i_have_plans",
      };
      let knowledgePath: "help_me_figure_out" | "i_know_what_i_want" | "i_have_plans" = "help_me_figure_out";
      const knowledgeAnswer = input.answers.find(a => a.questionId === KNOWLEDGE_QUESTION_ID);
      if (knowledgeAnswer && knowledgeAnswer.selectedOptionIds.length > 0) {
        const mapped = KNOWLEDGE_OPTION_MAP[knowledgeAnswer.selectedOptionIds[0]];
        if (mapped) knowledgePath = mapped;
      }

      // Extract dimension variables from answers (sqft, lf, rooms, bedrooms, bathrooms, floors)
      // These are stored as freeformValue on numeric questions
      let lf = 0, rooms = 0, bedrooms = 0, bathrooms = 0, floors = 1;
      for (const a of input.answers) {
        const q = allQuestions.find(q => q.id === a.questionId);
        if (!q) continue;
        const textLower = q.text.toLowerCase();
        const val = a.freeformValue !== undefined ? parseFloat(String(a.freeformValue)) || 0 : 0;
        if (textLower.includes('linear feet') || textLower.includes('lineal feet')) lf = val;
        else if (textLower.includes('bedroom')) bedrooms = val;
        else if (textLower.includes('bathroom') || textLower.includes('bath')) bathrooms = val;
        else if (textLower.includes('floor') || textLower.includes('story') || textLower.includes('stories')) floors = val || 1;
        else if (textLower.includes('room') && !textLower.includes('bedroom') && !textLower.includes('bathroom')) rooms = val;
      }

      const pricingResult = computeRoughPricing({
        answers: input.answers,
        sqft: input.sqft,
        lf, rooms, bedrooms, bathrooms, floors,
        knowledgePath,
        catalogItems: allCatalogItems.map(c => ({
          id: c.id,
          name: c.name,
          tradeSheet: c.tradeSheet,
          unit: c.unit,
          estimatedPrice: c.estimatedPrice ? String(c.estimatedPrice) : null,
          minimumPrice: c.minimumPrice ? String(c.minimumPrice) : null,
          defaultQtyFormula: c.defaultQtyFormula ?? null,
        })),
        dpPricingRules: (allDpPricingRules as DpPricingRule[]).map(r => ({
          id: r.id,
          name: r.name,
          catalogItemId: r.catalogItemId,
          conditions: (r.conditions as Array<{ questionId: number; optionIds: number[]; operator?: 'any' | 'all' }>) ?? [],
          quantity: r.quantity,
          tradeSection: r.tradeSection,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        })),
        priceRules: allRules.map(r => ({
          ...r,
          conditions: (r.conditions as Array<{ questionId: number; optionIds: number[] }>) ?? [],
        })),
        options: allOptions.map(o => ({
          id: o.id,
          questionId: o.questionId,
          text: o.text,
          priceAdjustment: String(o.priceAdjustment ?? "0"),
          priceAdjustmentType: o.priceAdjustmentType,
          pricingTier: o.pricingTier ?? null,
        })),
        questions: allQuestions.map(q => ({
          id: q.id,
          text: q.text,
          section: q.section ?? null,
          calculationRules: q.calculationRules,
        })),
        tierMultipliers: (allTierMultipliers as QuestionnairePricingTierMultiplier[]).map(tm => ({
          sectionKey: tm.sectionKey,
          tier: tm.tier,
          multiplier: String(tm.multiplier),
          weight: String(tm.weight),
          tierLabel: tm.tierLabel,
        })),
        pricingAddons: (allPricingAddons as QuestionnairePricingAddon[]).map(a => ({
          questionId: a.questionId,
          optionId: a.optionId ?? null,
          label: a.label,
          amount: String(a.amount),
          isActive: a.isActive,
        })),
      });

      const estimatedMin = pricingResult.low;
      const estimatedMax = pricingResult.high;

      // Save the estimate and knowledge path to the session
      await d.update(questionnaireSessions).set({
        estimatedMin: estimatedMin > 0 ? String(estimatedMin) : null,
        estimatedMax: estimatedMax > 0 ? String(estimatedMax) : null,
        knowledgePath,
      }).where(eq(questionnaireSessions.id, session.id));

      return {
        success: true,
        estimatedMin: estimatedMin > 0 ? estimatedMin : null,
        estimatedMax: estimatedMax > 0 ? estimatedMax : null,
        midpoint: pricingResult.midpoint > 0 ? pricingResult.midpoint : null,
        breakdown: pricingResult.breakdown,
        baseRuleName: pricingResult.baseRuleName,
        knowledgePath,
        rangeLabel: pricingResult.rangeLabel,
        rangeFactor: pricingResult.rangeFactor,
      };
    }),

  // ── Public: Look up dynamic questionnaire session by phone ──────────────
  getSessionByPhone: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;
      const normalized = normalizePhone(input.phone);
      const rows = await d.select().from(questionnaireSessions)
        .where(
          or(
            eq(questionnaireSessions.customerPhone, input.phone),
            like(questionnaireSessions.customerPhone, `%${normalized.slice(-10)}`)
          )
        )
        .orderBy(desc(questionnaireSessions.createdAt))
        .limit(5);
      if (!rows.length) return null;
      // Prefer completed sessions
      const completed = rows.find(r => r.completedAt !== null);
      const session = completed ?? rows[0];
      // Load answers
      const answers = await d.select().from(questionnaireAnswers)
        .where(eq(questionnaireAnswers.sessionId, session.id));
      return { session, answers };
    }),

  // ── Public: Get rough pricing for a completed session (±10% range) ────────
  getRoughPricing: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;

      const sessions = await d.select().from(questionnaireSessions)
        .where(eq(questionnaireSessions.sessionToken, input.token))
        .limit(1);
      if (!sessions.length) return null;
      const session = sessions[0];

      const answers = await d.select().from(questionnaireAnswers)
        .where(eq(questionnaireAnswers.sessionId, session.id));
      const allRules = await d.select().from(questionnairePriceRules)
        .where(eq(questionnairePriceRules.isActive, 1))
        .orderBy(asc(questionnairePriceRules.sortOrder));
      const allOptions = await d.select().from(questionnaireOptions);
      const allQuestions = await d.select().from(questionnaireQuestions);
      const allTierMultipliers = await d.select().from(questionnairePricingTierMultipliers);
      const allPricingAddons = await d.select().from(questionnairePricingAddons)
        .where(eq(questionnairePricingAddons.isActive, 1));

      const pricingResult = computeRoughPricing({
        answers: answers.map(a => ({
          questionId: a.questionId,
          selectedOptionIds: (a.selectedOptionIds as number[]) ?? [],
          quantities: a.quantities as Record<string, number> | undefined,
          freeformValue: a.freeformValue ?? undefined,
        })),
        priceRules: allRules.map(r => ({
          ...r,
          conditions: (r.conditions as Array<{ questionId: number; optionIds: number[] }>) ?? [],
        })),
        options: allOptions.map(o => ({
          id: o.id,
          questionId: o.questionId,
          text: o.text,
          priceAdjustment: String(o.priceAdjustment ?? "0"),
          priceAdjustmentType: o.priceAdjustmentType,
          pricingTier: o.pricingTier ?? null,
        })),
        questions: allQuestions.map(q => ({
          id: q.id,
          text: q.text,
          section: q.section ?? null,
          calculationRules: q.calculationRules,
        })),
        tierMultipliers: (allTierMultipliers as QuestionnairePricingTierMultiplier[]).map(tm => ({
          sectionKey: tm.sectionKey,
          tier: tm.tier,
          multiplier: String(tm.multiplier),
          weight: String(tm.weight),
          tierLabel: tm.tierLabel,
        })),
        pricingAddons: (allPricingAddons as QuestionnairePricingAddon[]).map(a => ({
          questionId: a.questionId,
          optionId: a.optionId ?? null,
          label: a.label,
          amount: String(a.amount),
          isActive: a.isActive,
        })),
      });

      return {
        sessionId: session.id,
        customerName: session.customerName,
        low: pricingResult.low,
        midpoint: pricingResult.midpoint,
        high: pricingResult.high,
        breakdown: pricingResult.breakdown,
        hasBaseRule: pricingResult.hasBaseRule,
        baseRuleName: pricingResult.baseRuleName,
        savedMin: session.estimatedMin ? parseFloat(String(session.estimatedMin)) : null,
        savedMax: session.estimatedMax ? parseFloat(String(session.estimatedMax)) : null,
      };
    }),

  // ── Admin: Pricing Tier Multipliers CRUD ──────────────────────────────────
  listTierMultipliers: adminProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    return d.select().from(questionnairePricingTierMultipliers)
      .orderBy(asc(questionnairePricingTierMultipliers.sectionKey), asc(questionnairePricingTierMultipliers.tier));
  }),

  upsertTierMultiplier: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      sectionKey: z.string().min(1),
      sectionLabel: z.string().min(1),
      tier: z.number().min(1).max(5),
      multiplier: z.number().min(0).max(10),
      tierLabel: z.string().default(""),
      weight: z.number().min(0).max(1).default(1),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      if (input.id) {
        await d.update(questionnairePricingTierMultipliers).set({
          sectionKey: input.sectionKey,
          sectionLabel: input.sectionLabel,
          tier: input.tier,
          multiplier: String(input.multiplier),
          tierLabel: input.tierLabel,
          weight: String(input.weight),
        }).where(eq(questionnairePricingTierMultipliers.id, input.id));
        return { success: true, id: input.id };
      }
      const [result] = await d.insert(questionnairePricingTierMultipliers).values({
        sectionKey: input.sectionKey,
        sectionLabel: input.sectionLabel,
        tier: input.tier,
        multiplier: String(input.multiplier),
        tierLabel: input.tierLabel,
        weight: String(input.weight),
      });
      const header = result as unknown as { insertId: number };
      return { success: true, id: header.insertId };
    }),

  deleteTierMultiplier: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.delete(questionnairePricingTierMultipliers)
        .where(eq(questionnairePricingTierMultipliers.id, input.id));
      return { success: true };
    }),

  // ── Admin: Pricing Add-ons CRUD ───────────────────────────────────────────
  listPricingAddons: adminProcedure.query(async () => {
    const d = await getDb();
    if (!d) return [];
    return d.select().from(questionnairePricingAddons)
      .orderBy(asc(questionnairePricingAddons.questionId), asc(questionnairePricingAddons.id));
  }),

  createPricingAddon: adminProcedure
    .input(z.object({
      questionId: z.number(),
      optionId: z.number().nullable().optional(),
      label: z.string().min(1),
      amount: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const [result] = await d.insert(questionnairePricingAddons).values({
        questionId: input.questionId,
        optionId: input.optionId ?? null,
        label: input.label,
        amount: String(input.amount),
        isActive: 1,
      });
      const header = result as unknown as { insertId: number };
      return { success: true, id: header.insertId };
    }),

  updatePricingAddon: adminProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().optional(),
      amount: z.number().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      const { id, amount, ...rest } = input;
      const updates: Record<string, unknown> = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      if (amount !== undefined) updates.amount = String(amount);
      if (Object.keys(updates).length > 0) {
        await d.update(questionnairePricingAddons).set(updates).where(eq(questionnairePricingAddons.id, id));
      }
      return { success: true };
    }),

  deletePricingAddon: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const d = await getDb();
      if (!d) throw new Error("Database not available");
      await d.delete(questionnairePricingAddons).where(eq(questionnairePricingAddons.id, input.id));
      return { success: true };
    }),

  // ── Public: Get detailed estimate breakdown from a completed session ─────
  getEstimateBreakdown: publicProcedure
    .input(z.object({ sessionId: z.number(), sqft: z.number().optional().default(0) }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;

      const sessions = await d.select().from(questionnaireSessions)
        .where(eq(questionnaireSessions.id, input.sessionId))
        .limit(1);
      if (!sessions.length) return null;
      const session = sessions[0];

      const answers = await d.select().from(questionnaireAnswers)
        .where(eq(questionnaireAnswers.sessionId, session.id));
      const allQuestions = await d.select().from(questionnaireQuestions);
      const allOptions = await d.select().from(questionnaireOptions);
      const allRules = await d.select().from(questionnairePriceRules)
        .where(eq(questionnairePriceRules.isActive, 1))
        .orderBy(asc(questionnairePriceRules.sortOrder));

      // Build maps
      const answerMap = new Map<number, number[]>();
      const quantityMap = new Map<number, Record<string, number>>();
      const freeformMap = new Map<number, string | number | string[]>();
      for (const a of answers) {
        answerMap.set(a.questionId, (a.selectedOptionIds as number[]) ?? []);
        if (a.quantities) quantityMap.set(a.questionId, a.quantities as Record<string, number>);
        if (a.freeformValue) freeformMap.set(a.questionId, a.freeformValue);
        else if (a.voiceTranscription) freeformMap.set(a.questionId, a.voiceTranscription);
      }
      // Find matching price rule for base range
      let matchedRule: QuestionnairePriceRule | null = null;
      for (const rule of allRules) {
        const conditions = (rule.conditions as Array<{ questionId: number; optionIds: number[] }>) ?? [];
        if (conditions.length === 0) {
          if (!matchedRule) matchedRule = rule;
          continue;
        }
        const allMatch = conditions.every(cond => {
          const selected = answerMap.get(cond.questionId) ?? [];
          return cond.optionIds.some(oid => selected.includes(oid));
        });
        if (allMatch) { matchedRule = rule; break; }
      }

      const breakdown: Array<{
        questionId: number;
        questionText: string;
        ruleName: string;
        type: "option_flat" | "option_percent" | "calc_fixed" | "calc_formula" | "base_range";
        amount: number;
        description?: string;
      }> = [];

      let estimatedMin = 0;
      let estimatedMax = 0;
      let totalAdjustment = 0;

      if (matchedRule) {
        estimatedMin = parseFloat(String(matchedRule.baseMin));
        estimatedMax = parseFloat(String(matchedRule.baseMax));
        breakdown.push({
          questionId: 0,
          questionText: "Base Price Range",
          ruleName: matchedRule.name,
          type: "base_range",
          amount: (estimatedMin + estimatedMax) / 2,
          description: `${formatCurrencyServer(estimatedMin)} – ${formatCurrencyServer(estimatedMax)}`,
        });

        // Option-based adjustments
        for (const a of answers) {
          const qtys = quantityMap.get(a.questionId) ?? {};
          const selectedIds = (a.selectedOptionIds as number[]) ?? [];
          for (const optionId of selectedIds) {
            const opt = allOptions.find(o => o.id === optionId);
            if (!opt || opt.priceAdjustmentType === "none") continue;
            const adj = parseFloat(String(opt.priceAdjustment ?? "0"));
            if (adj === 0) continue;
            const qty = qtys[String(optionId)] ?? 1;
            const question = allQuestions.find(q => q.id === a.questionId);

            if (opt.priceAdjustmentType === "flat") {
              const amount = adj * qty;
              totalAdjustment += amount;
              estimatedMin += amount;
              estimatedMax += amount;
              breakdown.push({
                questionId: a.questionId,
                questionText: question?.text ?? "Unknown",
                ruleName: `${opt.text}${qty > 1 ? ` ×${qty}` : ""}`,
                type: "option_flat",
                amount,
                description: qty > 1 ? `${formatCurrencyServer(adj)} × ${qty}` : undefined,
              });
            } else if (opt.priceAdjustmentType === "percent") {
              const factor = Math.pow(1 + adj / 100, qty);
              const beforeMin = estimatedMin;
              const beforeMax = estimatedMax;
              estimatedMin *= factor;
              estimatedMax *= factor;
              const avgChange = ((estimatedMin - beforeMin) + (estimatedMax - beforeMax)) / 2;
              totalAdjustment += avgChange;
              breakdown.push({
                questionId: a.questionId,
                questionText: question?.text ?? "Unknown",
                ruleName: `${opt.text} (${adj > 0 ? "+" : ""}${adj}%${qty > 1 ? ` ×${qty}` : ""})`,
                type: "option_percent",
                amount: avgChange,
              });
            }
          }
        }

        // Calculation rule adjustments
        const projectSqft = input.sqft ?? 0;
        for (const a of answers) {
          const question = allQuestions.find(q => q.id === a.questionId);
          if (!question) continue;
          const rules = (question.calculationRules as Array<{
            name: string;
            conditionType: string;
            conditionValue?: string | number | [number, number];
            fixedCost?: number;
            formula?: string;
            description?: string;
          }>) ?? [];
          if (rules.length === 0) continue;

          const freeform = freeformMap.get(a.questionId);
          let answerValue: number | string | string[] = "";
          if (freeform !== undefined) {
            answerValue = freeform;
          } else {
            const selectedIds = (a.selectedOptionIds as number[]) ?? [];
            if (selectedIds.length > 0) {
              const selectedOpts = allOptions.filter(o => selectedIds.includes(o.id));
              answerValue = selectedOpts.length === 1 ? selectedOpts[0].text : selectedOpts.map(o => o.text);
            }
          }

          for (const rule of rules) {
            if (!evaluateCondition(rule.conditionType, rule.conditionValue, answerValue)) continue;

            if (rule.fixedCost) {
              totalAdjustment += rule.fixedCost;
              estimatedMin += rule.fixedCost;
              estimatedMax += rule.fixedCost;
              breakdown.push({
                questionId: a.questionId,
                questionText: question.text,
                ruleName: rule.name || "Fixed Cost",
                type: "calc_fixed",
                amount: rule.fixedCost,
                description: rule.description,
              });
            }

            if (rule.formula) {
              try {
                const numAnswer = typeof answerValue === "number" ? answerValue : parseFloat(String(answerValue)) || 0;
                const formulaResult = evaluateFormula(rule.formula, numAnswer, projectSqft, projectSqft);
                totalAdjustment += formulaResult;
                estimatedMin += formulaResult;
                estimatedMax += formulaResult;
                breakdown.push({
                  questionId: a.questionId,
                  questionText: question.text,
                  ruleName: rule.name || "Formula",
                  type: "calc_formula",
                  amount: formulaResult,
                  description: rule.description || `Formula: ${rule.formula}`,
                });
              } catch (e) {
                // skip broken formulas
              }
            }
          }
        }

    estimatedMin = Math.round(estimatedMin / 100) * 100;
      estimatedMax = Math.round(estimatedMax / 100) * 100;
      }

      return {
        sessionId: session.id,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        completedAt: session.completedAt,
        estimatedMin,
        estimatedMax,
        totalAdjustment: Math.round(totalAdjustment),
        breakdown,
      };
    }),

  // ─── Design Package Catalog CRUD ────────────────────────────────────────────

  /** List all catalog items, optionally filtered by tradeSheet */
  listCatalogItems: adminProcedure
    .input(z.object({
      tradeSheet: z.string().optional(),
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const offset = (input.page - 1) * input.pageSize;
      let q = db.select().from(dpCatalogItems);
      const rows = await db.select().from(dpCatalogItems).orderBy(asc(dpCatalogItems.tradeSheet), asc(dpCatalogItems.sortOrder));
      let filtered = rows;
      if (input.tradeSheet) {
        filtered = filtered.filter(r => r.tradeSheet === input.tradeSheet);
      }
      if (input.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r => r.name.toLowerCase().includes(s) || (r.category || '').toLowerCase().includes(s));
      }
      const total = filtered.length;
      const items = filtered.slice(offset, offset + input.pageSize);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  /** Get distinct trade sheets */
  listTradeSheets: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const rows = await db.select({ tradeSheet: dpCatalogItems.tradeSheet }).from(dpCatalogItems).groupBy(dpCatalogItems.tradeSheet).orderBy(asc(dpCatalogItems.tradeSheet));
    return rows.map(r => r.tradeSheet);
  }),

  /** Create a catalog item */
  createCatalogItem: adminProcedure
    .input(z.object({
      tradeSheet: z.string().min(1),
      category: z.string().optional(),
      name: z.string().min(1),
      unit: z.string().default('each'),
      laborCost: z.number().min(0).default(0),
      materialCost: z.number().min(0).default(0),
      marginPct: z.number().min(0).max(99.99).default(37.5),
      estimatedPrice: z.number().min(0).default(0),
      minimumPrice: z.number().min(0).default(0),
      productLink: z.string().optional(),
      electricalContext: z.enum(['new_construction', 'changes', 'post_drywall']).optional(),
      defaultQtyFormula: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const [result] = await db.insert(dpCatalogItems).values({
        tradeSheet: input.tradeSheet,
        category: input.category || null,
        name: input.name,
        unit: input.unit,
        laborCost: String(input.laborCost),
        materialCost: String(input.materialCost),
        marginPct: String(input.marginPct),
        estimatedPrice: String(input.estimatedPrice),
        minimumPrice: String(input.minimumPrice),
        productLink: input.productLink || null,
        electricalContext: input.electricalContext || null,
        defaultQtyFormula: input.defaultQtyFormula || null,
        notes: input.notes || null,
      });
      return { success: true };
    }),

  /** Update a catalog item */
  updateCatalogItem: adminProcedure
    .input(z.object({
      id: z.number().int(),
      tradeSheet: z.string().min(1).optional(),
      category: z.string().optional(),
      name: z.string().min(1).optional(),
      unit: z.string().optional(),
      laborCost: z.number().min(0).optional(),
      materialCost: z.number().min(0).optional(),
      marginPct: z.number().min(0).max(99.99).optional(),
      estimatedPrice: z.number().min(0).optional(),
      minimumPrice: z.number().min(0).optional(),
      productLink: z.string().nullable().optional(),
      electricalContext: z.enum(['new_construction', 'changes', 'post_drywall']).nullable().optional(),
      defaultQtyFormula: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      isActive: z.number().int().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { id, ...fields } = input;
      const update: Record<string, unknown> = {};
      if (fields.tradeSheet !== undefined) update.tradeSheet = fields.tradeSheet;
      if (fields.category !== undefined) update.category = fields.category;
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.unit !== undefined) update.unit = fields.unit;
      if (fields.laborCost !== undefined) update.laborCost = String(fields.laborCost);
      if (fields.materialCost !== undefined) update.materialCost = String(fields.materialCost);
      if (fields.marginPct !== undefined) update.marginPct = String(fields.marginPct);
      if (fields.estimatedPrice !== undefined) update.estimatedPrice = String(fields.estimatedPrice);
      if (fields.minimumPrice !== undefined) update.minimumPrice = String(fields.minimumPrice);
      if (fields.productLink !== undefined) update.productLink = fields.productLink;
      if (fields.electricalContext !== undefined) update.electricalContext = fields.electricalContext;
      if (fields.defaultQtyFormula !== undefined) update.defaultQtyFormula = fields.defaultQtyFormula;
      if (fields.notes !== undefined) update.notes = fields.notes;
      if (fields.isActive !== undefined) update.isActive = fields.isActive;
      await db.update(dpCatalogItems).set(update).where(eq(dpCatalogItems.id, id));
      return { success: true };
    }),

  /** Delete a catalog item */
  deleteCatalogItem: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      await db.delete(dpCatalogItems).where(eq(dpCatalogItems.id, input.id));
      return { success: true };
    }),

  // ─── Design Package Pricing Rules CRUD ──────────────────────────────────────

  /** List all pricing rules */
  listPricingRules: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const rules = await db.select().from(dpPricingRules).orderBy(asc(dpPricingRules.tradeSection), asc(dpPricingRules.sortOrder));
    return rules;
  }),

  /** Create a pricing rule */
  createPricingRule: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      catalogItemId: z.number().int(),
      conditions: z.array(z.object({
        questionId: z.number().int(),
        optionIds: z.array(z.number().int()),
        operator: z.enum(['any', 'all']).optional(),
      })).default([]),
      quantity: z.string().default('1'),
      tradeSection: z.string().default('General'),
      sortOrder: z.number().int().default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      await db.insert(dpPricingRules).values({
        name: input.name,
        catalogItemId: input.catalogItemId,
        conditions: input.conditions,
        quantity: input.quantity,
        tradeSection: input.tradeSection,
        sortOrder: input.sortOrder,
        notes: input.notes || null,
      });
      return { success: true };
    }),

  /** Update a pricing rule */
  updatePricingRule: adminProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().min(1).optional(),
      catalogItemId: z.number().int().optional(),
      conditions: z.array(z.object({
        questionId: z.number().int(),
        optionIds: z.array(z.number().int()),
        operator: z.enum(['any', 'all']).optional(),
      })).optional(),
      quantity: z.string().optional(),
      tradeSection: z.string().optional(),
      sortOrder: z.number().int().optional(),
      notes: z.string().nullable().optional(),
      isActive: z.number().int().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { id, ...fields } = input;
      const update: Record<string, unknown> = {};
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.catalogItemId !== undefined) update.catalogItemId = fields.catalogItemId;
      if (fields.conditions !== undefined) update.conditions = fields.conditions;
      if (fields.quantity !== undefined) update.quantity = fields.quantity;
      if (fields.tradeSection !== undefined) update.tradeSection = fields.tradeSection;
      if (fields.sortOrder !== undefined) update.sortOrder = fields.sortOrder;
      if (fields.notes !== undefined) update.notes = fields.notes;
      if (fields.isActive !== undefined) update.isActive = fields.isActive;
      await db.update(dpPricingRules).set(update).where(eq(dpPricingRules.id, id));
      return { success: true };
    }),

  /** Delete a pricing rule */
  deletePricingRule: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      await db.delete(dpPricingRules).where(eq(dpPricingRules.id, input.id));
      return { success: true };
    }),

  /** Bulk-update margin % on all catalog items (optionally filtered by tradeSheet) */
  bulkUpdateMargin: adminProcedure
    .input(
      z.object({
        marginPct: z.number().min(0).max(99.99),
        tradeSheet: z.string().optional(), // if provided, only update items in this sheet
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Fetch all active items matching the optional tradeSheet filter
      const allItems = await db
        .select()
        .from(dpCatalogItems)
        .where(
          input.tradeSheet
            ? eq(dpCatalogItems.tradeSheet, input.tradeSheet)
            : eq(dpCatalogItems.isActive, 1)
        );

      const margin = input.marginPct / 100;
      let updatedCount = 0;

      for (const item of allItems) {
        const labor = Number(item.laborCost ?? 0);
        const material = Number(item.materialCost ?? 0);
        const baseCost = labor + material;
        // estimatedPrice = baseCost / (1 - margin), rounded to 2 decimal places
        const newPrice = margin < 1 ? Math.round((baseCost / (1 - margin)) * 100) / 100 : baseCost;
        await db
          .update(dpCatalogItems)
          .set({ marginPct: String(input.marginPct), estimatedPrice: String(newPrice) })
          .where(eq(dpCatalogItems.id, item.id));
        updatedCount++;
      }

      return { updatedCount, marginPct: input.marginPct, tradeSheet: input.tradeSheet ?? null };
    }),

  /** Get all catalog items and pricing rules together (for the pricing engine) */
  getCatalogAndRules: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const [items, rules] = await Promise.all([
      db.select().from(dpCatalogItems).where(eq(dpCatalogItems.isActive, 1)).orderBy(asc(dpCatalogItems.tradeSheet), asc(dpCatalogItems.sortOrder)),
      db.select().from(dpPricingRules).where(eq(dpPricingRules.isActive, 1)).orderBy(asc(dpPricingRules.tradeSection), asc(dpPricingRules.sortOrder)),
    ]);
    return { items, rules };
  }),

  // ── Cabinet Pricing CRUD ──────────────────────────────────────────────────

  /** List all cabinet pricing rows, optionally filtered by vendor */
  listCabinetPricing: adminProcedure
    .input(z.object({ vendor: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      let q = db.select().from(dpCabinetPricing).orderBy(
        asc(dpCabinetPricing.sortOrder),
        asc(dpCabinetPricing.vendor),
        asc(dpCabinetPricing.code),
        asc(dpCabinetPricing.lineItemType)
      );
      const rows = await q;
      if (input?.vendor) {
        return rows.filter(r => r.vendor === input.vendor);
      }
      return rows;
    }),

  /** List distinct vendors */
  listCabinetVendors: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const rows = await db.select({ vendor: dpCabinetPricing.vendor }).from(dpCabinetPricing);
    const vendors = Array.from(new Set(rows.map(r => r.vendor)));
    return vendors;
  }),

  /** Update a single cabinet pricing row */
  updateCabinetPricingRow: adminProcedure
    .input(z.object({
      id: z.number(),
      msrpUnitPrice: z.number().optional(),
      discountedUnitPrice: z.number().optional(),
      marginPct: z.number().min(0).max(99.99).optional(),
      estimatedPrice: z.number().optional(),
      isActive: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { id, ...fields } = input;
      const now = Date.now();
      // If marginPct is being set, recompute estimatedPrice from discountedUnitPrice
      const updateData: Record<string, unknown> = { ...fields, updatedAt: now };
      if (fields.marginPct !== undefined && fields.discountedUnitPrice !== undefined) {
        const margin = fields.marginPct / 100;
        updateData.estimatedPrice = margin >= 1 ? fields.discountedUnitPrice : Math.round(fields.discountedUnitPrice / (1 - margin) * 100) / 100;
      } else if (fields.marginPct !== undefined) {
        // Fetch current discountedUnitPrice
        const [existing] = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.id, id));
        if (existing) {
          const base = parseFloat(existing.discountedUnitPrice);
          const margin = fields.marginPct / 100;
          updateData.estimatedPrice = margin >= 1 ? base : Math.round(base / (1 - margin) * 100) / 100;
        }
      }
      await db.update(dpCabinetPricing).set(updateData as Partial<DpCabinetPricing>).where(eq(dpCabinetPricing.id, id));
      const [updated] = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.id, id));
      return updated;
    }),

  /** Bulk update margin for all cabinet pricing rows (optionally scoped to a vendor) */
  bulkUpdateCabinetMargin: adminProcedure
    .input(z.object({
      marginPct: z.number().min(0).max(99.99),
      vendor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const now = Date.now();
      const margin = input.marginPct / 100;
      // Fetch all matching rows
      const rows = await db.select().from(dpCabinetPricing);
      const targets = input.vendor ? rows.filter(r => r.vendor === input.vendor) : rows;
      let updated = 0;
      for (const row of targets) {
        const base = parseFloat(row.discountedUnitPrice);
        const newPrice = margin >= 1 ? base : Math.round(base / (1 - margin) * 100) / 100;
        await db.update(dpCabinetPricing)
          .set({ marginPct: String(input.marginPct), estimatedPrice: String(newPrice), updatedAt: now })
          .where(eq(dpCabinetPricing.id, row.id));
        updated++;
      }
      return { updated, marginPct: input.marginPct };
    }),

  /** Sync active cabinet pricing rows into dp_catalog_items as tradeSheet='Cabinetry' */
  syncCabinetsToCatalog: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const now = new Date();
    // Remove existing Cabinetry rows from catalog
    await db.delete(dpCatalogItems).where(eq(dpCatalogItems.tradeSheet, 'Cabinetry'));
    // Fetch all active cabinet pricing rows
    const cabRows = await db.select().from(dpCabinetPricing).where(eq(dpCabinetPricing.isActive, 1));
    let synced = 0;
    for (const row of cabRows) {
      const lineLabel = row.lineItemType === 'base' ? 'Base Cabinets' : row.lineItemType === 'upper' ? 'Upper Cabinets' : 'Pantry/Utility Cabinets';
      await db.insert(dpCatalogItems).values({
        tradeSheet: 'Cabinetry',
        name: `${row.optionLabel} — ${lineLabel}`,
        unit: row.unit,
        laborCost: '0',
        materialCost: String(row.discountedUnitPrice),
        marginPct: String(row.marginPct),
        estimatedPrice: String(row.estimatedPrice),
        isActive: 1,
        sortOrder: row.sortOrder,
        notes: `Vendor: ${row.vendor}${row.collection ? ' / ' + row.collection : ''} | Code: ${row.code}`,
        createdAt: now,
        updatedAt: now,
      });
      synced++;
    }
    return { synced };
  }),

  // ── Admin: List all uploaded files for a session ──────────────────────────
  getSessionFiles: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const files = await db
        .select()
        .from(questionnaireSessionFiles)
        .where(eq(questionnaireSessionFiles.sessionId, input.sessionId))
        .orderBy(asc(questionnaireSessionFiles.uploadedAt));
      return files;
    }),

  // ── Admin: Delete an uploaded file record ─────────────────────────────────
  deleteSessionFile: adminProcedure
    .input(z.object({ fileId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      await db
        .delete(questionnaireSessionFiles)
        .where(eq(questionnaireSessionFiles.id, input.fileId));
      return { success: true };
    }),

  // ── Public: Save uploaded file metadata (called after S3 upload) ──────────
  saveSessionFile: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      questionId: z.number().optional(),
      fileKey: z.string(),
      fileUrl: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      fileCategory: z.string().default("other"),
      questionLabel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      // Resolve sessionId from token
      const [session] = await db
        .select({ id: questionnaireSessions.id })
        .from(questionnaireSessions)
        .where(eq(questionnaireSessions.sessionToken, input.sessionToken))
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      await db!.insert(questionnaireSessionFiles).values({
        sessionId: session.id,
        questionId: input.questionId ?? null,
        fileKey: input.fileKey,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        fileCategory: input.fileCategory,
        questionLabel: input.questionLabel ?? null,
      });
      return { success: true };
    }),
});
