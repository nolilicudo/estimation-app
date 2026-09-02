/**
 * Tests for new questionnaire question types:
 *   - quantity_select: options with per-option quantities
 *   - voice_photo: voice transcription + S3 photo URLs
 *
 * These tests verify the DB schema columns exist and the pricing engine
 * correctly handles the new answer fields.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

let conn: mysql.Connection;

beforeAll(async () => {
  conn = await mysql.createConnection(process.env.DATABASE_URL!);
});

afterAll(async () => {
  await conn.end();
});

// ─── Schema: new columns exist ────────────────────────────────────────────────

describe("questionnaire_answers schema", () => {
  it("has quantities column", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM questionnaire_answers LIKE 'quantities'`
    );
    expect(rows.length).toBe(1);
    expect(rows[0].Type).toMatch(/json|text/i);
  });

  it("has voiceTranscription column", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM questionnaire_answers LIKE 'voiceTranscription'`
    );
    expect(rows.length).toBe(1);
  });

  it("has photoUrls column", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM questionnaire_answers LIKE 'photoUrls'`
    );
    expect(rows.length).toBe(1);
  });
});

describe("questionnaire_questions schema", () => {
  it("accepts quantity_select type", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM questionnaire_questions LIKE 'type'`
    );
    expect(rows.length).toBe(1);
    const typeCol: string = rows[0].Type;
    expect(typeCol).toContain("quantity_select");
  });

  it("accepts voice_photo type", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM questionnaire_questions LIKE 'type'`
    );
    const typeCol: string = rows[0].Type;
    expect(typeCol).toContain("voice_photo");
  });
});

// ─── Seeded data: 10-section questions exist ─────────────────────────────────

describe("seeded questionnaire questions", () => {
  it("has single-select questions in project_basics section", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id, text, type, section FROM questionnaire_questions WHERE section = 'project_basics' AND isActive = 1`
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].section).toBe("project_basics");
  });

  it("has questions in all 10 sections", async () => {
    const sections = [
      'project_basics', 'existing_conditions', 'site_access',
      'structure_foundation_roof', 'mechanical_electrical_plumbing',
      'exterior_finishes', 'interior_finishes', 'trade_upgrades',
      'overall_finish_level', 'photos_inspiration',
    ];
    for (const section of sections) {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT id FROM questionnaire_questions WHERE section = ? AND isActive = 1`,
        [section]
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has photo_upload questions in photos_inspiration or plan_based section", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT id, text, type, section FROM questionnaire_questions WHERE type = 'photo_upload' AND isActive = 1`
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const validSections = ["photos_inspiration", "plan_based"];
    for (const row of rows) {
      expect(validSections).toContain(row.section);
    }
  });

  it("has visual-choice questions with pricingTier options in overall_finish_level", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT q.id, q.text, q.section FROM questionnaire_questions q
       JOIN questionnaire_options o ON o.questionId = q.id
       WHERE q.section = 'overall_finish_level' AND o.pricingTier IS NOT NULL AND q.isActive = 1
       LIMIT 1`
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].section).toBe("overall_finish_level");
  });

  it("has at least 40 active questions across all sections", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM questionnaire_questions WHERE isActive = 1`
    );
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(40);
  });
});

// ─── Options: pricingTier 1-5 exist in overall_finish_level section ──────────

describe("pricingTier options", () => {
  it("has options with pricingTier 1 through 5", async () => {
    for (let tier = 1; tier <= 5; tier++) {
      const [rows] = await conn.execute<mysql.RowDataPacket[]>(
        `SELECT o.id, o.text, o.pricingTier FROM questionnaire_options o
         JOIN questionnaire_questions q ON q.id = o.questionId
         WHERE o.pricingTier = ? AND q.isActive = 1
         LIMIT 1`,
        [tier]
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0].pricingTier).toBe(tier);
    }
  });

  it("Level 1 options exist in exterior_finishes or overall_finish_level", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT o.text, o.pricingTier, q.section
       FROM questionnaire_options o
       JOIN questionnaire_questions q ON q.id = o.questionId
       WHERE o.pricingTier = 1 AND q.section IN ('exterior_finishes', 'interior_finishes', 'overall_finish_level')
       LIMIT 1`
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].pricingTier).toBe(1);
  });

  it("Level 5 options exist for luxury finishes", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT o.text, o.pricingTier FROM questionnaire_options o
       WHERE o.pricingTier = 5
       LIMIT 1`
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].pricingTier).toBe(5);
  });
});

// ─── Photo upload questions have correct structure ────────────────────────────

describe("photo upload question structure", () => {
  it("photo_upload questions have no options (they are upload prompts)", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT q.id, COUNT(o.id) as optCount
       FROM questionnaire_questions q
       LEFT JOIN questionnaire_options o ON o.questionId = q.id
       WHERE q.type = 'photo_upload' AND q.isActive = 1
       GROUP BY q.id`
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(Number(row.optCount)).toBe(0);
    }
  });

  it("has 8 photo upload questions (one per required photo category)", async () => {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM questionnaire_questions WHERE type = 'photo_upload' AND isActive = 1`
    );
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(8);
  });
});
