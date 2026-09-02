/**
 * Seed script: insert the 3 pre-visit questionnaire questions + per-room follow-ups
 * Run with: node scripts/seed-questionnaire.mjs
 *
 * Q1 — "What type of addition are you considering?" (quantity_select, 12 room options)
 * Q2 — "Are you looking for an addition in your yard or above your existing home?" (single, pricing impact)
 * Q3 — "Are you wanting to remodel or adjust part of the existing portion of your house?" (voice_photo)
 *
 * Per-room follow-ups (branching off Q1 options):
 *   Each selected room type gets 2 follow-up questions:
 *     - Finish level (single: Basic / Standard / Premium)
 *     - Existing condition (single: Good / Fair / Poor)
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function insertQuestion({ text, subtext = "", type, sortOrder, parentQuestionId = null, parentOptionId = null }) {
  const [result] = await conn.execute(
    `INSERT INTO questionnaire_questions (text, subtext, type, sortOrder, isActive, parentQuestionId, parentOptionId)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    [text, subtext, type, sortOrder, parentQuestionId, parentOptionId]
  );
  return result.insertId;
}

async function insertOption({ questionId, text, subtext = "", sortOrder, priceAdjustment = 0, priceAdjustmentType = "none" }) {
  const [result] = await conn.execute(
    `INSERT INTO questionnaire_options (questionId, text, subtext, sortOrder, priceAdjustment, priceAdjustmentType)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [questionId, text, subtext, sortOrder, priceAdjustment, priceAdjustmentType]
  );
  return result.insertId;
}

// ─── Check if questions already exist ────────────────────────────────────────

const [existing] = await conn.execute(
  `SELECT COUNT(*) as cnt FROM questionnaire_questions WHERE text LIKE '%What type of addition%'`
);
if (existing[0].cnt > 0) {
  console.log("Questionnaire questions already seeded. Skipping.");
  await conn.end();
  process.exit(0);
}

// ─── Q1: Room types (quantity_select) ────────────────────────────────────────

const q1Id = await insertQuestion({
  text: "What type of addition are you considering?",
  subtext: "Select all that apply and enter how many of each room you want to add.",
  type: "quantity_select",
  sortOrder: 10,
});
console.log("Created Q1 id:", q1Id);

const roomTypes = [
  { text: "Kitchen",           subtext: "Full kitchen addition",                     sort: 1,  priceAdj: 85000,  adjType: "flat" },
  { text: "Master Suite",      subtext: "Master bedroom + bathroom",                 sort: 2,  priceAdj: 75000,  adjType: "flat" },
  { text: "Home Theater Room", subtext: "Dedicated media/theater room",              sort: 3,  priceAdj: 55000,  adjType: "flat" },
  { text: "Bedroom",           subtext: "Standard bedroom",                          sort: 4,  priceAdj: 40000,  adjType: "flat" },
  { text: "Bathroom",          subtext: "Full or half bath",                         sort: 5,  priceAdj: 35000,  adjType: "flat" },
  { text: "Family/Game Room",  subtext: "Open living or entertainment space",        sort: 6,  priceAdj: 45000,  adjType: "flat" },
  { text: "Gym",               subtext: "Home gym or fitness room",                  sort: 7,  priceAdj: 40000,  adjType: "flat" },
  { text: "Office",            subtext: "Home office or study",                      sort: 8,  priceAdj: 38000,  adjType: "flat" },
  { text: "ADU",               subtext: "Accessory Dwelling Unit / in-law suite",    sort: 9,  priceAdj: 120000, adjType: "flat" },
  { text: "Garage",            subtext: "Attached or detached garage",               sort: 10, priceAdj: 50000,  adjType: "flat" },
  { text: "Kitchenette",       subtext: "Small kitchenette or wet bar area",         sort: 11, priceAdj: 30000,  adjType: "flat" },
  { text: "Wet Bar",           subtext: "Bar area with sink",                        sort: 12, priceAdj: 25000,  adjType: "flat" },
];

const roomOptionIds = {};
for (const room of roomTypes) {
  const optId = await insertOption({
    questionId: q1Id,
    text: room.text,
    subtext: room.subtext,
    sortOrder: room.sort,
    priceAdjustment: room.priceAdj,
    priceAdjustmentType: room.adjType,
  });
  roomOptionIds[room.text] = optId;
  console.log(`  Q1 option: ${room.text} → id ${optId}`);
}

// ─── Q2: Yard vs above existing home (single, big pricing impact) ─────────────

const q2Id = await insertQuestion({
  text: "Are you looking for an addition in your yard or above your existing home?",
  subtext: "This significantly affects the structural requirements and overall cost.",
  type: "single",
  sortOrder: 20,
});
console.log("Created Q2 id:", q2Id);

const q2Yard = await insertOption({
  questionId: q2Id,
  text: "In my yard (ground-level addition)",
  subtext: "New foundation, simpler structural work",
  sortOrder: 1,
  priceAdjustment: 0,
  priceAdjustmentType: "none",
});
const q2Above = await insertOption({
  questionId: q2Id,
  text: "Above my existing home (second story)",
  subtext: "Requires reinforcing existing structure — significantly higher cost",
  sortOrder: 2,
  priceAdjustment: 40,
  priceAdjustmentType: "percent",
});
console.log(`  Q2 options: yard=${q2Yard}, above=${q2Above}`);

// ─── Q3: Remodel existing portion (voice_photo) ───────────────────────────────

const q3Id = await insertQuestion({
  text: "Are you wanting to remodel or adjust part of the existing portion of your house?",
  subtext: "Tell us what you have in mind — describe your vision and upload any inspiration photos.",
  type: "voice_photo",
  sortOrder: 30,
});
console.log("Created Q3 id:", q3Id);

// ─── Per-room follow-up questions ─────────────────────────────────────────────
// For each room type, add 2 branching follow-up questions:
//   1. Finish level (single: Basic / Standard / Premium)
//   2. Existing condition of the space being added onto (single: Good / Fair / Poor)

const finishLevels = [
  { text: "Basic",    subtext: "Builder-grade finishes, functional and clean",       priceAdj: -10, adjType: "percent" },
  { text: "Standard", subtext: "Mid-range finishes, good quality materials",         priceAdj: 0,   adjType: "none" },
  { text: "Premium",  subtext: "High-end finishes, custom details, premium materials", priceAdj: 30, adjType: "percent" },
];

const existingConditions = [
  { text: "Good",  subtext: "Minimal prep work needed",              priceAdj: 0,  adjType: "none" },
  { text: "Fair",  subtext: "Some repairs or modifications needed",  priceAdj: 8,  adjType: "percent" },
  { text: "Poor",  subtext: "Significant repairs or demo required",  priceAdj: 18, adjType: "percent" },
];

let followUpSortBase = 100;
for (const room of roomTypes) {
  const optId = roomOptionIds[room.text];

  // Follow-up 1: Finish level
  const fq1Id = await insertQuestion({
    text: `What finish level are you envisioning for your ${room.text}?`,
    subtext: "This helps us give you a more accurate price range.",
    type: "single",
    sortOrder: followUpSortBase,
    parentQuestionId: q1Id,
    parentOptionId: optId,
  });
  for (let i = 0; i < finishLevels.length; i++) {
    await insertOption({
      questionId: fq1Id,
      text: finishLevels[i].text,
      subtext: finishLevels[i].subtext,
      sortOrder: i + 1,
      priceAdjustment: finishLevels[i].priceAdj,
      priceAdjustmentType: finishLevels[i].adjType,
    });
  }

  // Follow-up 2: Existing condition
  const fq2Id = await insertQuestion({
    text: `What is the current condition of the area where the ${room.text} will be added?`,
    subtext: "Existing site conditions affect prep and demo costs.",
    type: "single",
    sortOrder: followUpSortBase + 1,
    parentQuestionId: q1Id,
    parentOptionId: optId,
  });
  for (let i = 0; i < existingConditions.length; i++) {
    await insertOption({
      questionId: fq2Id,
      text: existingConditions[i].text,
      subtext: existingConditions[i].subtext,
      sortOrder: i + 1,
      priceAdjustment: existingConditions[i].priceAdj,
      priceAdjustmentType: existingConditions[i].adjType,
    });
  }

  console.log(`  Follow-ups for ${room.text}: finish=${fq1Id}, condition=${fq2Id}`);
  followUpSortBase += 10;
}

// ─── Default price rule ───────────────────────────────────────────────────────

const [existingRules] = await conn.execute(`SELECT COUNT(*) as cnt FROM questionnaire_price_rules`);
if (existingRules[0].cnt === 0) {
  await conn.execute(
    `INSERT INTO questionnaire_price_rules (name, baseMin, baseMax, conditions, sortOrder, isActive)
     VALUES (?, ?, ?, ?, ?, 1)`,
    ["Default — Ground-Level Addition", 150000, 350000, JSON.stringify([]), 999]
  );
  console.log("Created default price rule");
}

await conn.end();
console.log("\n✅ Questionnaire seed complete!");
