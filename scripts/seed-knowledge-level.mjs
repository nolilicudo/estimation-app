/**
 * Seed Script: Section 0 — Project Knowledge Level
 * 
 * Inserts a single branching question at the very start of the questionnaire
 * with three path options:
 *   - "help_me_figure_out" → idea-level pricing (existing 10-section flow, ±10%)
 *   - "i_know_what_i_want" → guided selection pricing (adds dimension/fixture follow-ups, ±7%)
 *   - "i_have_plans"       → plan-based pricing (plan upload + scope confirmation, ±5%)
 * 
 * Also seeds path-specific follow-up questions:
 *   Path 2: room dimensions, fixture counts, material preferences
 *   Path 3: plan upload (photo_upload), sqft confirmation, scope notes
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Helper ──────────────────────────────────────────────────────────────────
async function upsertQuestion({ id, text, type, section, sortOrder, helpText, isActive = 1 }) {
  await conn.execute(
    `INSERT INTO questionnaire_questions
       (id, text, subtext, type, section, sortOrder, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       text=VALUES(text), subtext=VALUES(subtext), type=VALUES(type), section=VALUES(section),
       sortOrder=VALUES(sortOrder), isActive=VALUES(isActive),
       updatedAt=NOW()`,
    [id, text, helpText ?? null, type, section, sortOrder, isActive]
  );
}

async function upsertOption({ id, questionId, text, value, sortOrder, pricingTier = null, imageUrl = null }) {
  // questionnaire_options has: id, questionId, text, subtext, imageUrl, sortOrder, priceAdjustment, priceAdjustmentType, pricingTier
  // 'value' is stored as subtext (the option's machine-readable value)
  await conn.execute(
    `INSERT INTO questionnaire_options
       (id, questionId, text, subtext, sortOrder, pricingTier, imageUrl, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       text=VALUES(text), subtext=VALUES(subtext), sortOrder=VALUES(sortOrder),
       pricingTier=VALUES(pricingTier), imageUrl=VALUES(imageUrl), updatedAt=NOW()`,
    [id, questionId, text, value ?? text, sortOrder, pricingTier, imageUrl]
  );
}

// ─── Section 0: Project Knowledge Level ──────────────────────────────────────
// Main branching question — sortOrder 0 so it appears before all other sections
await upsertQuestion({
  id: 80001,
  text: "Where are you in your project planning?",
  type: "single",
  section: "project_knowledge",
  sortOrder: 0,
  helpText: "This helps us ask the right questions and give you the most accurate pricing estimate.",
});

await upsertOption({ id: 800011, questionId: 80001, text: "Help me figure out what I want", value: "help_me_figure_out", sortOrder: 1 });
await upsertOption({ id: 800012, questionId: 80001, text: "I know what I want", value: "i_know_what_i_want", sortOrder: 2 });
await upsertOption({ id: 800013, questionId: 80001, text: "I have plans already", value: "i_have_plans", sortOrder: 3 });

console.log("✅ Section 0: Project Knowledge Level — main question seeded");

// ─── Path 2: "I know what I want" — Guided Selection Follow-ups ───────────────
// These questions appear only when option 800012 (i_know_what_i_want) is selected.
// They are in section "guided_selection" and have parentQuestionId/parentOptionId set.

await upsertQuestion({
  id: 80010,
  text: "What are the approximate dimensions of the main space being added or remodeled?",
  type: "text",
  section: "guided_selection",
  sortOrder: 1,
  helpText: "Enter length × width in feet (e.g. 20 × 24). If multiple rooms, list each one.",
});

await upsertQuestion({
  id: 80011,
  text: "How many bathrooms will be included or remodeled?",
  type: "number",
  section: "guided_selection",
  sortOrder: 2,
  helpText: "Include full baths, half baths, and en-suite bathrooms.",
});

await upsertQuestion({
  id: 80012,
  text: "How many bedrooms will be added or remodeled?",
  type: "number",
  section: "guided_selection",
  sortOrder: 3,
  helpText: "Count only bedrooms that are new or being significantly changed.",
});

await upsertQuestion({
  id: 80013,
  text: "Do you have specific material preferences for any of the following?",
  type: "multi",
  section: "guided_selection",
  sortOrder: 4,
  helpText: "Select all that apply. We'll ask follow-up questions about each one.",
});

await upsertOption({ id: 800131, questionId: 80013, text: "Flooring type", value: "flooring", sortOrder: 1 });
await upsertOption({ id: 800132, questionId: 80013, text: "Cabinet style / color", value: "cabinets", sortOrder: 2 });
await upsertOption({ id: 800133, questionId: 80013, text: "Countertop material", value: "countertops", sortOrder: 3 });
await upsertOption({ id: 800134, questionId: 80013, text: "Exterior siding / cladding", value: "exterior_siding", sortOrder: 4 });
await upsertOption({ id: 800135, questionId: 80013, text: "Roofing material", value: "roofing", sortOrder: 5 });
await upsertOption({ id: 800136, questionId: 80013, text: "Windows / doors", value: "windows_doors", sortOrder: 6 });
await upsertOption({ id: 800137, questionId: 80013, text: "Plumbing fixtures", value: "plumbing_fixtures", sortOrder: 7 });
await upsertOption({ id: 800138, questionId: 80013, text: "Lighting / electrical", value: "lighting_electrical", sortOrder: 8 });
await upsertOption({ id: 800139, questionId: 80013, text: "No specific preferences yet", value: "no_preferences", sortOrder: 9 });

await upsertQuestion({
  id: 80014,
  text: "What is your target budget range for this project?",
  type: "single",
  section: "guided_selection",
  sortOrder: 5,
  helpText: "This helps us calibrate the estimate to realistic options within your range.",
});

await upsertOption({ id: 800141, questionId: 80014, text: "Under $100,000", value: "under_100k", sortOrder: 1 });
await upsertOption({ id: 800142, questionId: 80014, text: "$100,000 – $200,000", value: "100k_200k", sortOrder: 2 });
await upsertOption({ id: 800143, questionId: 80014, text: "$200,000 – $350,000", value: "200k_350k", sortOrder: 3 });
await upsertOption({ id: 800144, questionId: 80014, text: "$350,000 – $500,000", value: "350k_500k", sortOrder: 4 });
await upsertOption({ id: 800145, questionId: 80014, text: "$500,000+", value: "over_500k", sortOrder: 5 });
await upsertOption({ id: 800146, questionId: 80014, text: "I'm not sure yet", value: "not_sure", sortOrder: 6 });

await upsertQuestion({
  id: 80015,
  text: "Do you have any specific structural requirements or constraints we should know about?",
  type: "text",
  section: "guided_selection",
  sortOrder: 6,
  helpText: "Examples: load-bearing wall removal, second-story addition over existing foundation, HOA restrictions.",
});

console.log("✅ Path 2: Guided Selection — 6 questions seeded");

// ─── Path 3: "I have plans already" — Plan-Based Pricing ─────────────────────
// These questions appear only when option 800013 (i_have_plans) is selected.
// They are in section "plan_based" and use photo_upload for the plans themselves.

await upsertQuestion({
  id: 80020,
  text: "Please upload your architectural plans or drawings.",
  type: "photo_upload",
  section: "plan_based",
  sortOrder: 1,
  helpText: "Upload PDFs, photos of blueprints, or any drawings you have. Multiple files are welcome. The more detail you provide, the more accurate your estimate will be.",
});

await upsertQuestion({
  id: 80021,
  text: "What is the total square footage shown on your plans?",
  type: "number",
  section: "plan_based",
  sortOrder: 2,
  helpText: "Enter the total conditioned square footage of the addition or remodel as shown on the plans.",
});

await upsertQuestion({
  id: 80022,
  text: "What stage are your plans at?",
  type: "single",
  section: "plan_based",
  sortOrder: 3,
  helpText: "This tells us how much detail is available for pricing.",
});

await upsertOption({ id: 800221, questionId: 80022, text: "Conceptual / sketch drawings", value: "conceptual", sortOrder: 1 });
await upsertOption({ id: 800222, questionId: 80022, text: "Preliminary / design development", value: "preliminary", sortOrder: 2 });
await upsertOption({ id: 800223, questionId: 80022, text: "Construction documents (stamped)", value: "construction_docs", sortOrder: 3 });
await upsertOption({ id: 800224, questionId: 80022, text: "Permit-ready / approved plans", value: "permit_ready", sortOrder: 4 });

await upsertQuestion({
  id: 80023,
  text: "Have you received any bids or estimates from other contractors?",
  type: "single",
  section: "plan_based",
  sortOrder: 4,
  helpText: "If yes, we can help you compare and understand what's included.",
});

await upsertOption({ id: 800231, questionId: 80023, text: "Yes — I have bids to compare", value: "yes_have_bids", sortOrder: 1 });
await upsertOption({ id: 800232, questionId: 80023, text: "No — this is my first estimate", value: "no_first_estimate", sortOrder: 2 });
await upsertOption({ id: 800233, questionId: 80023, text: "I have a rough budget from my architect", value: "architect_budget", sortOrder: 3 });

await upsertQuestion({
  id: 80024,
  text: "Are there any scope items on your plans that you know you want to handle separately or exclude from this estimate?",
  type: "text",
  section: "plan_based",
  sortOrder: 5,
  helpText: "Examples: owner-supplied fixtures, owner-installed flooring, separate landscaping contract, solar panels.",
});

await upsertQuestion({
  id: 80025,
  text: "Upload any additional reference photos, site photos, or inspiration images.",
  type: "photo_upload",
  section: "plan_based",
  sortOrder: 6,
  helpText: "Site photos help us understand access, existing conditions, and any constraints not visible on the plans.",
});

console.log("✅ Path 3: Plan-Based Pricing — 6 questions seeded");

// ─── Set branching logic for path-specific questions ─────────────────────────
// Path 2 questions (80010–80015) → show only when Q80001 answer = "i_know_what_i_want" (optionId 800012)
const path2QuestionIds = [80010, 80011, 80012, 80013, 80014, 80015];
for (const qId of path2QuestionIds) {
  await conn.execute(
    `UPDATE questionnaire_questions SET parentQuestionId=80001, parentOptionId=800012 WHERE id=?`,
    [qId]
  );
}

// Path 3 questions (80020–80025) → show only when Q80001 answer = "i_have_plans" (optionId 800013)
const path3QuestionIds = [80020, 80021, 80022, 80023, 80024, 80025];
for (const qId of path3QuestionIds) {
  await conn.execute(
    `UPDATE questionnaire_questions SET parentQuestionId=80001, parentOptionId=800013 WHERE id=?`,
    [qId]
  );
}

console.log("✅ Branching logic set for Path 2 and Path 3 questions");

await conn.end();
console.log("\n🎉 Section 0 seed complete — Project Knowledge Level with 3 paths");
