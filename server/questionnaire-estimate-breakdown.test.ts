/**
 * Tests for the questionnaire estimate breakdown and phone lookup procedures.
 * Verifies that calculation rules produce correct pricing adjustments.
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

function trpcInput(input: any): string {
  return encodeURIComponent(JSON.stringify({ json: input }));
}

function trpcResult(json: any): any {
  return json?.result?.data?.json;
}

describe("Questionnaire Estimate Breakdown", () => {
  it("should return a breakdown with totalAdjustment from option-based pricing", async () => {
    // Create a test question with options that have price adjustments
    const [qResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO questionnaire_questions (text, type, inputType, sortOrder, isActive) VALUES (?, ?, ?, ?, ?)`,
      ["Test Breakdown Question", "single", "options", 999, true]
    );
    const questionId = qResult.insertId;

    // Create option with flat price adjustment
    const [optResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO questionnaire_options (questionId, text, sortOrder, priceAdjustment, priceAdjustmentType) VALUES (?, ?, ?, ?, ?)`,
      [questionId, "Expensive Option", 1, 5000, "flat"]
    );
    const optionId = optResult.insertId;

    // Create a session
    const token = `test-breakdown-${Date.now()}`;
    const [sessResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO questionnaire_sessions (sessionToken, customerName, customerPhone, completedAt) VALUES (?, ?, ?, NOW())`,
      [token, "Breakdown Test Customer", "5551234567"]
    );
    const sessionId = sessResult.insertId;

    // Submit an answer selecting the expensive option
    await conn.execute(
      `INSERT INTO questionnaire_answers (sessionId, questionId, selectedOptionIds) VALUES (?, ?, ?)`,
      [sessionId, questionId, JSON.stringify([optionId])]
    );

    // Call the API endpoint
    const response = await fetch(`http://localhost:3000/api/trpc/questionnaire.getEstimateBreakdown?input=${trpcInput({ sessionId, sqft: 1500 })}`);
    const json = await response.json();

    expect(response.status).toBe(200);
    const result = trpcResult(json);
    expect(result).toBeDefined();
    expect(result.sessionId).toBe(sessionId);
    expect(result.totalAdjustment).toBe(5000);
    expect(result.breakdown).toBeInstanceOf(Array);
    expect(result.breakdown.length).toBeGreaterThan(0);
    // The breakdown includes base range + option adjustments; find the option adjustment entry
    const optionEntry = result.breakdown.find((b: any) => b.questionText === "Test Breakdown Question");
    expect(optionEntry).toBeDefined();
    expect(optionEntry.amount).toBe(5000);

    // Cleanup
    await conn.execute(`DELETE FROM questionnaire_answers WHERE sessionId = ?`, [sessionId]);
    await conn.execute(`DELETE FROM questionnaire_sessions WHERE id = ?`, [sessionId]);
    await conn.execute(`DELETE FROM questionnaire_options WHERE questionId = ?`, [questionId]);
    await conn.execute(`DELETE FROM questionnaire_questions WHERE id = ?`, [questionId]);
  });

  it("should return a breakdown with calculation rule adjustments", async () => {
    // Create a question with calculation rules
    const rules = JSON.stringify([
      {
        name: "Window Cost",
        conditionType: "greater_than",
        conditionValue: 0,
        fixedCost: 2500,
        formula: "answer * 500",
      }
    ]);
    const [qResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO questionnaire_questions (text, type, inputType, sortOrder, isActive, calculationRules) VALUES (?, ?, ?, ?, ?, ?)`,
      ["How many windows?", "single", "number", 998, true, rules]
    );
    const questionId = qResult.insertId;

    // Create a session
    const token = `test-calc-rule-${Date.now()}`;
    const [sessResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO questionnaire_sessions (sessionToken, customerName, customerPhone, completedAt) VALUES (?, ?, ?, NOW())`,
      [token, "Calc Rule Customer", "5559876543"]
    );
    const sessionId = sessResult.insertId;

    // Submit an answer with freeform value
    await conn.execute(
      `INSERT INTO questionnaire_answers (sessionId, questionId, selectedOptionIds, freeformValue) VALUES (?, ?, ?, ?)`,
      [sessionId, questionId, JSON.stringify([]), "4"]
    );

    // Call the API endpoint
    const response = await fetch(`http://localhost:3000/api/trpc/questionnaire.getEstimateBreakdown?input=${trpcInput({ sessionId, sqft: 2000 })}`);
    const json = await response.json();

    expect(response.status).toBe(200);
    const result = trpcResult(json);
    expect(result).toBeDefined();
    expect(result.sessionId).toBe(sessionId);
    // fixedCost 2500 + formula (4 * 500 = 2000) = 4500
    expect(result.totalAdjustment).toBe(4500);
    expect(result.breakdown.length).toBeGreaterThanOrEqual(2); // fixedCost + formula (may also include option adjustments)

    // Cleanup
    await conn.execute(`DELETE FROM questionnaire_answers WHERE sessionId = ?`, [sessionId]);
    await conn.execute(`DELETE FROM questionnaire_sessions WHERE id = ?`, [sessionId]);
    await conn.execute(`DELETE FROM questionnaire_questions WHERE id = ?`, [questionId]);
  });

  it("getSessionByPhone should return session data for a valid phone", async () => {
    // Create a session
    const token = `test-phone-lookup-${Date.now()}`;
    const [sessResult] = await conn.execute<mysql.ResultSetHeader>(
      `INSERT INTO questionnaire_sessions (sessionToken, customerName, customerPhone, completedAt) VALUES (?, ?, ?, NOW())`,
      [token, "Phone Lookup Customer", "5550001111"]
    );
    const sessionId = sessResult.insertId;

    // Call the API endpoint
    const response = await fetch(`http://localhost:3000/api/trpc/questionnaire.getSessionByPhone?input=${trpcInput({ phone: "5550001111" })}`);
    const json = await response.json();

    expect(response.status).toBe(200);
    const result = trpcResult(json);
    expect(result).toBeDefined();
    expect(result.session).toBeDefined();
    expect(result.session.customerName).toBe("Phone Lookup Customer");

    // Cleanup
    await conn.execute(`DELETE FROM questionnaire_sessions WHERE id = ?`, [sessionId]);
  });

  it("getSessionByPhone should return null session for unknown phone", async () => {
    const response = await fetch(`http://localhost:3000/api/trpc/questionnaire.getSessionByPhone?input=${trpcInput({ phone: "0000000000" })}`);
    const json = await response.json();

    expect(response.status).toBe(200);
    const result = trpcResult(json);
    expect(result).toBeNull();
  });
});
