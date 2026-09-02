/**
 * Seed script: Frost Footing Sizes + Pricing + Formula defaults
 * Data transcribed from "Frost Footing Detail — Table 1: Frost Footing Sizes"
 *
 * Table structure: rows = joist length (6–16 ft), cols = post spacing (4–14 ft)
 * Each cell has 3 values: [col1 (largest), col2 (medium), col3 (smallest)]
 * Two footing types per cell: Corner Footing and Intermediate Footing
 *
 * Run: node seed-frost-footings.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Frost Footing Lookup Table ─────────────────────────────────────────────
// Format: [joistLengthFt][postSpacingFt] = { corner: [d1,d2,d3], intermediate: [d1,d2,d3] }
// Post spacings: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
// Joist lengths: 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16

const TABLE = {
  6: {
    4:  { corner: [6,5,4],   intermediate: [9,8,7]   },
    5:  { corner: [7,6,5],   intermediate: [10,8,7]  },
    6:  { corner: [7,6,5],   intermediate: [10,9,7]  },
    7:  { corner: [8,7,6],   intermediate: [11,9,8]  },
    8:  { corner: [9,7,6],   intermediate: [12,10,9] },
    9:  { corner: [9,7,6],   intermediate: [13,10,9] },
    10: { corner: [10,8,7],  intermediate: [14,11,10] },
    11: { corner: [10,8,7],  intermediate: [14,12,10] },
    12: { corner: [10,9,7],  intermediate: [15,12,10] },
    13: { corner: [11,9,8],  intermediate: [15,13,11] },
    14: { corner: [11,9,8],  intermediate: [16,13,11] },
  },
  7: {
    4:  { corner: [7,5,5],   intermediate: [9,8,7]   },
    5:  { corner: [7,6,5],   intermediate: [10,8,7]  },
    6:  { corner: [8,7,6],   intermediate: [11,9,8]  },
    7:  { corner: [9,7,6],   intermediate: [12,10,9] },
    8:  { corner: [9,8,7],   intermediate: [13,11,9] },
    9:  { corner: [10,8,7],  intermediate: [14,11,10] },
    10: { corner: [10,8,7],  intermediate: [15,12,10] },
    11: { corner: [11,9,8],  intermediate: [15,13,11] },
    12: { corner: [11,9,8],  intermediate: [16,13,11] },
    13: { corner: [12,10,9], intermediate: [17,14,12] },
    14: { corner: [12,10,9], intermediate: [17,14,12] },
  },
  8: {
    4:  { corner: [7,6,5],   intermediate: [10,8,7]  },
    5:  { corner: [8,6,6],   intermediate: [11,9,8]  },
    6:  { corner: [9,7,6],   intermediate: [12,10,9] },
    7:  { corner: [9,8,7],   intermediate: [13,11,9] },
    8:  { corner: [10,8,7],  intermediate: [14,11,10] },
    9:  { corner: [10,8,7],  intermediate: [15,12,10] },
    10: { corner: [11,9,8],  intermediate: [16,13,11] },
    11: { corner: [11,9,8],  intermediate: [16,13,12] },
    12: { corner: [12,10,9], intermediate: [17,14,12] },
    13: { corner: [13,10,9], intermediate: [18,15,13] },
    14: { corner: [13,11,9], intermediate: [18,15,13] },
  },
  9: {
    4:  { corner: [7,6,5],   intermediate: [10,9,7]  },
    5:  { corner: [8,7,6],   intermediate: [12,10,8] },
    6:  { corner: [9,7,6],   intermediate: [13,10,9] },
    7:  { corner: [10,8,7],  intermediate: [14,11,10] },
    8:  { corner: [10,9,7],  intermediate: [15,12,10] },
    9:  { corner: [11,9,8],  intermediate: [16,13,11] },
    10: { corner: [12,10,8], intermediate: [17,14,12] },
    11: { corner: [12,10,9], intermediate: [17,14,12] },
    12: { corner: [13,10,9], intermediate: [18,15,13] },
    13: { corner: [13,11,9], intermediate: [18,15,13] },
    14: { corner: [14,11,10], intermediate: [20,16,14] },
  },
  10: {
    4:  { corner: [8,6,6],   intermediate: [11,9,8]  },
    5:  { corner: [9,7,6],   intermediate: [12,10,9] },
    6:  { corner: [10,8,7],  intermediate: [14,11,10] },
    7:  { corner: [10,8,7],  intermediate: [15,12,10] },
    8:  { corner: [11,9,8],  intermediate: [16,13,11] },
    9:  { corner: [12,10,8], intermediate: [17,14,12] },
    10: { corner: [12,10,9], intermediate: [17,14,12] },
    11: { corner: [13,11,9], intermediate: [18,15,13] },
    12: { corner: [14,11,10], intermediate: [19,16,14] },
    13: { corner: [14,12,10], intermediate: [20,16,14] },
    14: { corner: [15,12,10], intermediate: [21,17,15] },
  },
  11: {
    4:  { corner: [8,7,6],   intermediate: [12,9,8]  },
    5:  { corner: [9,7,6],   intermediate: [13,11,9] },
    6:  { corner: [10,8,7],  intermediate: [14,12,10] },
    7:  { corner: [11,9,8],  intermediate: [15,12,10] },
    8:  { corner: [12,9,8],  intermediate: [16,13,11] },
    9:  { corner: [12,10,9], intermediate: [17,14,12] },
    10: { corner: [13,11,9], intermediate: [17,14,12] },
    11: { corner: [14,11,10], intermediate: [18,15,13] },
    12: { corner: [14,12,10], intermediate: [19,16,14] },
    13: { corner: [15,12,10], intermediate: [20,16,14] },
    14: { corner: [15,13,11], intermediate: [21,17,15] },
  },
  12: {
    4:  { corner: [9,7,6],   intermediate: [12,10,9] },
    5:  { corner: [10,8,7],  intermediate: [14,11,10] },
    6:  { corner: [10,9,7],  intermediate: [15,12,10] },
    7:  { corner: [11,9,8],  intermediate: [16,13,11] },
    8:  { corner: [12,10,9], intermediate: [17,14,12] },
    9:  { corner: [13,10,9], intermediate: [18,15,13] },
    10: { corner: [14,11,10], intermediate: [19,16,14] },
    11: { corner: [14,12,10], intermediate: [20,16,14] },
    12: { corner: [15,12,10], intermediate: [21,17,15] },
    13: { corner: [15,13,11], intermediate: [22,18,15] },
    14: { corner: [16,13,11], intermediate: [23,18,16] },
  },
  13: {
    4:  { corner: [9,7,6],   intermediate: [13,10,9] },
    5:  { corner: [10,8,7],  intermediate: [14,12,10] },
    6:  { corner: [11,9,8],  intermediate: [15,13,11] },
    7:  { corner: [12,10,8], intermediate: [17,14,12] },
    8:  { corner: [12,10,9], intermediate: [18,15,13] },
    9:  { corner: [13,11,9], intermediate: [19,15,13] },
    10: { corner: [14,12,10], intermediate: [20,16,14] },
    11: { corner: [15,13,11], intermediate: [21,17,15] },
    12: { corner: [15,13,11], intermediate: [22,18,15] },
    13: { corner: [16,13,11], intermediate: [23,19,16] },
    14: { corner: [17,14,12], intermediate: [24,19,17] },
  },
  14: {
    4:  { corner: [9,8,7],   intermediate: [13,11,9] },
    5:  { corner: [10,8,7],  intermediate: [14,13,10] },
    6:  { corner: [11,9,8],  intermediate: [16,13,11] },
    7:  { corner: [12,10,9], intermediate: [17,14,12] },
    8:  { corner: [13,11,9], intermediate: [18,15,13] },
    9:  { corner: [14,11,10], intermediate: [20,16,14] },
    10: { corner: [15,12,10], intermediate: [21,17,15] },
    11: { corner: [15,13,11], intermediate: [22,18,16] },
    12: { corner: [16,13,11], intermediate: [22,18,16] },
    13: { corner: [17,14,12], intermediate: [24,19,17] },
    14: { corner: [17,14,12], intermediate: [24,20,17] },
  },
  15: {
    4:  { corner: [10,8,7],  intermediate: [14,11,10] },
    5:  { corner: [11,9,8],  intermediate: [15,12,11] },
    6:  { corner: [12,10,8], intermediate: [17,14,12] },
    7:  { corner: [13,10,9], intermediate: [18,15,13] },
    8:  { corner: [14,11,10], intermediate: [19,16,14] },
    9:  { corner: [14,12,10], intermediate: [20,17,14] },
    10: { corner: [15,12,11], intermediate: [21,17,15] },
    11: { corner: [16,13,11], intermediate: [22,18,16] },
    12: { corner: [17,14,12], intermediate: [23,19,17] },
    13: { corner: [17,14,12], intermediate: [24,20,17] },
    14: { corner: [18,15,13], intermediate: [25,21,18] },
  },
  16: {
    4:  { corner: [10,8,7],  intermediate: [14,11,10] },
    5:  { corner: [11,9,8],  intermediate: [16,13,11] },
    6:  { corner: [12,10,9], intermediate: [17,14,12] },
    7:  { corner: [13,11,9], intermediate: [18,15,13] },
    8:  { corner: [14,11,10], intermediate: [20,16,14] },
    9:  { corner: [15,12,10], intermediate: [21,17,15] },
    10: { corner: [15,12,11], intermediate: [22,19,16] },
    11: { corner: [16,13,12], intermediate: [22,19,16] },
    12: { corner: [17,14,12], intermediate: [24,20,17] },
    13: { corner: [18,15,13], intermediate: [25,21,18] },
    14: { corner: [18,15,13], intermediate: [26,21,18] },
  },
};

// ─── Clear and re-seed frost_footing_sizes ───────────────────────────────────
console.log("Clearing frost_footing_sizes...");
await db.execute("DELETE FROM frost_footing_sizes");

const rows = [];
for (const [joistLen, postSpacings] of Object.entries(TABLE)) {
  for (const [postSpacing, data] of Object.entries(postSpacings)) {
    rows.push([parseInt(joistLen), parseInt(postSpacing), "corner",       data.corner[0],       data.corner[1],       data.corner[2]]);
    rows.push([parseInt(joistLen), parseInt(postSpacing), "intermediate", data.intermediate[0], data.intermediate[1], data.intermediate[2]]);
  }
}

console.log(`Inserting ${rows.length} frost footing size rows...`);
for (const row of rows) {
  await db.execute(
    "INSERT INTO frost_footing_sizes (joistLengthFt, postSpacingFt, footingType, diameterIn1, diameterIn2, diameterIn3) VALUES (?, ?, ?, ?, ?, ?)",
    row
  );
}

// ─── Seed frost_footing_pricing (unique diameters found in the table) ────────
const allDiameters = new Set();
for (const postSpacings of Object.values(TABLE)) {
  for (const data of Object.values(postSpacings)) {
    for (const d of [...data.corner, ...data.intermediate]) allDiameters.add(d);
  }
}
const sortedDiameters = [...allDiameters].sort((a, b) => a - b);

console.log("Clearing frost_footing_pricing...");
await db.execute("DELETE FROM frost_footing_pricing");

console.log(`Inserting ${sortedDiameters.length} diameter pricing rows: ${sortedDiameters.join(", ")} inches`);
for (let i = 0; i < sortedDiameters.length; i++) {
  const d = sortedDiameters[i];
  await db.execute(
    `INSERT INTO frost_footing_pricing (diameterIn, label, costPerUnit, marginPct, pricePerUnit, isActive, sortOrder)
     VALUES (?, ?, 0.00, 35.00, 0.00, 1, ?)`,
    [d, `${d}" Footing`, i]
  );
}

// ─── Seed frost_footing_formulas ─────────────────────────────────────────────
console.log("Clearing frost_footing_formulas...");
await db.execute("DELETE FROM frost_footing_formulas");

const formulas = [
  {
    key: "diameter_column",
    label: "Footing Diameter Column",
    value: "2",
    description: "Which diameter column to use from the lookup table: 1 = largest (highest load), 2 = medium (standard), 3 = smallest (lightest load). Default: 2.",
  },
  {
    key: "corner_footing_count_formula",
    label: "Corner Footing Count Formula",
    value: "4",
    description: "Number of corner footings per deck. Default: 4 (one per corner). Can be overridden with a fixed number.",
  },
  {
    key: "intermediate_footing_count_formula",
    label: "Intermediate Footing Count Formula",
    value: "postCount - 2",
    description: "Formula for intermediate footing count. Uses 'postCount' variable (auto-calculated from deck width ÷ post spacing). Default: postCount - 2 (excludes the 2 corner posts).",
  },
  {
    key: "post_count_formula",
    label: "Post Count Formula",
    value: "ceil(deckWidthFt / postSpacingFt) + 1",
    description: "Formula for total post count along the beam. Variables: deckWidthFt, postSpacingFt. Default: ceil(deckWidthFt / postSpacingFt) + 1.",
  },
  {
    key: "joist_length_lookup",
    label: "Joist Length Lookup Method",
    value: "joistSpanFt",
    description: "Which value to use as the 'joist length' for the lookup table row. Options: 'joistSpanFt' (from lumber package), 'deckLengthFt' (deck length). Default: joistSpanFt.",
  },
];

for (const f of formulas) {
  await db.execute(
    "INSERT INTO frost_footing_formulas (`key`, label, value, description) VALUES (?, ?, ?, ?)",
    [f.key, f.label, f.value, f.description]
  );
}

console.log("✅ Frost footing seed complete!");
await db.end();
