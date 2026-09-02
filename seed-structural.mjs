/**
 * Seed structural engineering tables:
 * - joist_span_entries (IRC R507.5, Douglas Fir-Larch, 16" OC)
 * - lvl_beam_entries (3.5" Versa-Lam 2.1E LVL)
 * - hot_tub_weights (2-10 person hot tubs)
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// ── Joist Span Entries (IRC R507.5, Douglas Fir-Larch, 16" OC) ──────────────
// Each row: joistSize, spacingIn, maxSpanFt, loadFactorMin, loadFactorMax
// loadFactorMin/Max define the psf range where this span is valid
// Base load (no hot tub) = 0–1.0; hot tub loads reduce allowable span
const joistRows = [
  // 2×8 @ 16" OC
  { joistSize: "2×8",  spacingIn: 16, maxSpanFt: "12.00", loadFactorMin: "0.00", loadFactorMax: "1.00", notes: "Base load",     sortOrder: 10 },
  { joistSize: "2×8",  spacingIn: 16, maxSpanFt: "10.00", loadFactorMin: "1.01", loadFactorMax: "1.25", notes: "Light HT load", sortOrder: 11 },
  { joistSize: "2×8",  spacingIn: 16, maxSpanFt: "8.00",  loadFactorMin: "1.26", loadFactorMax: "1.50", notes: "Medium HT load",sortOrder: 12 },
  { joistSize: "2×8",  spacingIn: 16, maxSpanFt: "6.00",  loadFactorMin: "1.51", loadFactorMax: "9999.00", notes: "Heavy HT load", sortOrder: 13 },
  // 2×10 @ 16" OC
  { joistSize: "2×10", spacingIn: 16, maxSpanFt: "16.00", loadFactorMin: "0.00", loadFactorMax: "1.00", notes: "Base load",     sortOrder: 20 },
  { joistSize: "2×10", spacingIn: 16, maxSpanFt: "14.00", loadFactorMin: "1.01", loadFactorMax: "1.25", notes: "Light HT load", sortOrder: 21 },
  { joistSize: "2×10", spacingIn: 16, maxSpanFt: "12.00", loadFactorMin: "1.26", loadFactorMax: "1.50", notes: "Medium HT load",sortOrder: 22 },
  { joistSize: "2×10", spacingIn: 16, maxSpanFt: "10.00", loadFactorMin: "1.51", loadFactorMax: "9999.00", notes: "Heavy HT load", sortOrder: 23 },
  // 2×12 @ 16" OC
  { joistSize: "2×12", spacingIn: 16, maxSpanFt: "20.00", loadFactorMin: "0.00", loadFactorMax: "1.00", notes: "Base load",     sortOrder: 30 },
  { joistSize: "2×12", spacingIn: 16, maxSpanFt: "18.00", loadFactorMin: "1.01", loadFactorMax: "1.25", notes: "Light HT load", sortOrder: 31 },
  { joistSize: "2×12", spacingIn: 16, maxSpanFt: "16.00", loadFactorMin: "1.26", loadFactorMax: "1.50", notes: "Medium HT load",sortOrder: 32 },
  { joistSize: "2×12", spacingIn: 16, maxSpanFt: "14.00", loadFactorMin: "1.51", loadFactorMax: "9999.00", notes: "Heavy HT load", sortOrder: 33 },
];

// ── LVL Beam Entries (3.5" Versa-Lam 2.1E) ──────────────────────────────────
// maxPostSpacingFt: max post spacing (span) this beam handles
// maxPlf: max pounds per linear foot this beam handles
// beamSize: label shown to admin
const beamRows = [
  { maxPostSpacingFt: "6.00",  maxPlf: "800.00",  beamSize: '3.5"×9.25"',  isDouble: 0, sortOrder: 10 },
  { maxPostSpacingFt: "8.00",  maxPlf: "700.00",  beamSize: '3.5"×9.25"',  isDouble: 0, sortOrder: 20 },
  { maxPostSpacingFt: "10.00", maxPlf: "600.00",  beamSize: '3.5"×9.25"',  isDouble: 0, sortOrder: 30 },
  { maxPostSpacingFt: "12.00", maxPlf: "500.00",  beamSize: '3.5"×11.25"', isDouble: 0, sortOrder: 40 },
  { maxPostSpacingFt: "14.00", maxPlf: "450.00",  beamSize: '3.5"×11.25"', isDouble: 0, sortOrder: 50 },
  { maxPostSpacingFt: "16.00", maxPlf: "400.00",  beamSize: '3.5"×14"',    isDouble: 0, sortOrder: 60 },
  { maxPostSpacingFt: "18.00", maxPlf: "350.00",  beamSize: '3.5"×16"',    isDouble: 0, sortOrder: 70 },
  { maxPostSpacingFt: "20.00", maxPlf: "300.00",  beamSize: '3.5"×18"',    isDouble: 0, sortOrder: 80 },
  // Doubled beam entries (for heavy loads)
  { maxPostSpacingFt: "12.00", maxPlf: "1000.00", beamSize: 'Double 3.5"×11.25"', isDouble: 1, sortOrder: 90 },
  { maxPostSpacingFt: "16.00", maxPlf: "800.00",  beamSize: 'Double 3.5"×14"',    isDouble: 1, sortOrder: 100 },
  { maxPostSpacingFt: "20.00", maxPlf: "600.00",  beamSize: 'Double 3.5"×18"',    isDouble: 1, sortOrder: 110 },
];

// ── Hot Tub Weights ──────────────────────────────────────────────────────────
// persons, weightLb (filled), footprintSqft, psf, loadFactor
const hotTubRows = [
  { persons: 2,  weightLb: 1500, footprintSqft: "20.00", psf: "75.00",  loadFactor: "1.30", notes: "2-person spa",       sortOrder: 10 },
  { persons: 3,  weightLb: 2000, footprintSqft: "24.00", psf: "83.00",  loadFactor: "1.35", notes: "3-person spa",       sortOrder: 20 },
  { persons: 4,  weightLb: 2500, footprintSqft: "28.00", psf: "89.00",  loadFactor: "1.40", notes: "4-person spa",       sortOrder: 30 },
  { persons: 5,  weightLb: 3000, footprintSqft: "32.00", psf: "94.00",  loadFactor: "1.45", notes: "5-person spa",       sortOrder: 40 },
  { persons: 6,  weightLb: 3500, footprintSqft: "36.00", psf: "97.00",  loadFactor: "1.50", notes: "6-person spa (avg)", sortOrder: 50 },
  { persons: 7,  weightLb: 4000, footprintSqft: "40.00", psf: "100.00", loadFactor: "1.55", notes: "7-person spa",       sortOrder: 60 },
  { persons: 8,  weightLb: 4500, footprintSqft: "44.00", psf: "102.00", loadFactor: "1.60", notes: "8-person spa",       sortOrder: 70 },
  { persons: 9,  weightLb: 5000, footprintSqft: "50.00", psf: "100.00", loadFactor: "1.65", notes: "9-person spa",       sortOrder: 80 },
  { persons: 10, weightLb: 5500, footprintSqft: "56.00", psf: "98.00",  loadFactor: "1.70", notes: "10-person spa",      sortOrder: 90 },
];

async function seed() {
  // Clear existing data
  await conn.execute("DELETE FROM joist_span_entries");
  await conn.execute("DELETE FROM lvl_beam_entries");
  await conn.execute("DELETE FROM hot_tub_weights");

  // Seed joist span entries
  for (const row of joistRows) {
    await conn.execute(
      "INSERT INTO joist_span_entries (joistSize, spacingIn, maxSpanFt, loadFactorMin, loadFactorMax, notes, sortOrder, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [row.joistSize, row.spacingIn, row.maxSpanFt, row.loadFactorMin, row.loadFactorMax, row.notes ?? null, row.sortOrder]
    );
  }
  console.log(`✓ Seeded ${joistRows.length} joist span entries`);

  // Seed LVL beam entries
  for (const row of beamRows) {
    await conn.execute(
      "INSERT INTO lvl_beam_entries (maxPostSpacingFt, maxPlf, beamSize, isDouble, sortOrder, isActive) VALUES (?, ?, ?, ?, ?, 1)",
      [row.maxPostSpacingFt, row.maxPlf, row.beamSize, row.isDouble, row.sortOrder]
    );
  }
  console.log(`✓ Seeded ${beamRows.length} LVL beam entries`);

  // Seed hot tub weights
  for (const row of hotTubRows) {
    await conn.execute(
      "INSERT INTO hot_tub_weights (persons, weightLb, footprintSqft, psf, loadFactor, notes, sortOrder, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [row.persons, row.weightLb, row.footprintSqft, row.psf, row.loadFactor, row.notes ?? null, row.sortOrder]
    );
  }
  console.log(`✓ Seeded ${hotTubRows.length} hot tub weight entries`);

  await conn.end();
  console.log("✓ Structural data seeded successfully");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
