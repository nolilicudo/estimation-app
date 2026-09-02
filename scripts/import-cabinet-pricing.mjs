/**
 * Creates dp_cabinet_pricing table and imports all cabinet options
 * from the Woodoo + US Cabinet Depot pricing spreadsheet.
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── DB connection ──────────────────────────────────────────────────────────
const pool = mysql.createPool(process.env.DATABASE_URL);

// ── Create table ───────────────────────────────────────────────────────────
await pool.execute(`
  CREATE TABLE IF NOT EXISTS dp_cabinet_pricing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor VARCHAR(100) NOT NULL,
    collection VARCHAR(100) DEFAULT NULL,
    style VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    option_label VARCHAR(200) NOT NULL,
    line_item_type ENUM('base', 'upper', 'pantry') NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'LF',
    msrp_unit_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    discounted_unit_price DECIMAL(10,4) NOT NULL DEFAULT 0,
    margin_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT 0
  )
`);
console.log("✓ Table dp_cabinet_pricing ready");

// ── Clear existing rows ────────────────────────────────────────────────────
await pool.execute("DELETE FROM dp_cabinet_pricing");
console.log("✓ Cleared existing rows");

// ── Load spreadsheet ───────────────────────────────────────────────────────
const filePath = "/home/ubuntu/upload/cabinet_msrp_lf_pricing_woodoo_uscd_discounted.xlsx";
const wb = XLSX.readFile(filePath);

const rows = [];
const now = Date.now();

// ── Helper: insert 3 line items per cabinet option ─────────────────────────
function addOption(vendor, collection, style, color, code, optionLabel,
  baseMsrp, baseDiscounted,
  upperMsrp, upperDiscounted, upperLabel,
  pantryMsrp, pantryDiscounted,
  notes, sortBase) {

  // Base cabinets (LF)
  rows.push({
    vendor, collection, style, color, code, option_label: optionLabel,
    line_item_type: "base", unit: "LF",
    msrp_unit_price: Math.round(baseMsrp * 10000) / 10000,
    discounted_unit_price: Math.round(baseDiscounted * 10000) / 10000,
    margin_pct: 0,
    estimated_price: Math.round(baseDiscounted * 100) / 100,
    notes, is_active: 1, sort_order: sortBase,
  });

  // Upper cabinets (LF)
  rows.push({
    vendor, collection, style, color, code, option_label: optionLabel,
    line_item_type: "upper", unit: "LF",
    msrp_unit_price: Math.round(upperMsrp * 10000) / 10000,
    discounted_unit_price: Math.round(upperDiscounted * 10000) / 10000,
    margin_pct: 0,
    estimated_price: Math.round(upperDiscounted * 100) / 100,
    notes, is_active: 1, sort_order: sortBase + 1,
  });

  // Pantry / Utility cabinets (EA)
  rows.push({
    vendor, collection, style, color, code, option_label: optionLabel,
    line_item_type: "pantry", unit: "EA",
    msrp_unit_price: Math.round(pantryMsrp * 10000) / 10000,
    discounted_unit_price: Math.round(pantryDiscounted * 10000) / 10000,
    margin_pct: 0,
    estimated_price: Math.round(pantryDiscounted * 100) / 100,
    notes, is_active: 1, sort_order: sortBase + 2,
  });
}

// ── Parse Woodoo Pricing Data ──────────────────────────────────────────────
const woodooWs = wb.Sheets["Pricing Data"];
const woodooData = XLSX.utils.sheet_to_json(woodooWs, { header: 1 });
// Header: Style, Color, Woodoo Code, Option Label, Base MSRP/LF (Exact), Base MSRP/LF (Rounded),
//         39" Upper MSRP/LF (Exact), 39" Upper MSRP/LF (Rounded), Avg. 66" Pantry MSRP (Exact), Avg. 66" Pantry MSRP (Rounded), Calculation Basis
let sortIdx = 0;
for (let i = 1; i < woodooData.length; i++) {
  const r = woodooData[i];
  if (!r[0]) continue;
  const [style, color, code, optionLabel,
    baseMsrpExact, _baseMsrpRounded,
    upperMsrpExact, _upperMsrpRounded,
    pantryMsrpExact, _pantryMsrpRounded,
    notes] = r;

  addOption(
    "Woodoo Cabinetry", null, style, color, String(code), optionLabel,
    baseMsrpExact, baseMsrpExact,   // Woodoo: no discount, MSRP = price
    upperMsrpExact, upperMsrpExact,
    '39" Upper',
    pantryMsrpExact, pantryMsrpExact,
    notes || null, sortIdx
  );
  sortIdx += 10;
}
console.log(`✓ Parsed ${sortIdx / 10} Woodoo options`);

// ── Parse USCD Pricing Data ────────────────────────────────────────────────
const uscdWs = wb.Sheets["USCD Pricing Data"];
const uscdData = XLSX.utils.sheet_to_json(uscdWs, { header: 1 });
// Header: Vendor, Collection, Style, Color, Code, Option Label,
//         Base MSRP x 0.75 / LF (Exact), Base MSRP x 0.75 / LF (Rounded),
//         42" Upper MSRP x 0.75 / LF (Exact), 42" Upper MSRP x 0.75 / LF (Rounded),
//         Avg. Pantry/Utility MSRP x 0.75 (Exact), Avg. Pantry/Utility MSRP x 0.75 (Rounded),
//         Calculation Basis
for (let i = 1; i < uscdData.length; i++) {
  const r = uscdData[i];
  if (!r[0]) continue;
  const [vendor, collection, style, color, code, optionLabel,
    baseMsrpExact, _baseMsrpRounded,
    upperMsrpExact, _upperMsrpRounded,
    pantryMsrpExact, _pantryMsrpRounded,
    notes] = r;

  // USCD prices are already MSRP × 0.75 (discounted)
  // MSRP = discounted / 0.75
  const baseMsrp = baseMsrpExact / 0.75;
  const upperMsrp = upperMsrpExact / 0.75;
  const pantryMsrp = pantryMsrpExact / 0.75;

  addOption(
    vendor, collection, style, color, String(code), optionLabel,
    baseMsrp, baseMsrpExact,
    upperMsrp, upperMsrpExact,
    '42" Upper',
    pantryMsrp, pantryMsrpExact,
    notes || null, sortIdx
  );
  sortIdx += 10;
}
console.log(`✓ Parsed ${(sortIdx / 10) - (rows.length / 3 - rows.length / 3)} USCD options`);
console.log(`✓ Total rows to insert: ${rows.length}`);

// ── Insert all rows ────────────────────────────────────────────────────────
let inserted = 0;
for (const row of rows) {
  await pool.execute(
    `INSERT INTO dp_cabinet_pricing
      (vendor, collection, style, color, code, option_label, line_item_type, unit,
       msrp_unit_price, discounted_unit_price, margin_pct, estimated_price,
       notes, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.vendor, row.collection, row.style, row.color, row.code, row.option_label,
      row.line_item_type, row.unit,
      row.msrp_unit_price, row.discounted_unit_price, row.margin_pct, row.estimated_price,
      row.notes, row.is_active, row.sort_order, now, now,
    ]
  );
  inserted++;
}

console.log(`✓ Inserted ${inserted} rows into dp_cabinet_pricing`);

// ── Verify ─────────────────────────────────────────────────────────────────
const [countRows] = await pool.execute("SELECT COUNT(*) as cnt FROM dp_cabinet_pricing");
console.log(`✓ Verified: ${countRows[0].cnt} rows in dp_cabinet_pricing`);

// ── Show summary by vendor ─────────────────────────────────────────────────
const [summary] = await pool.execute(
  "SELECT vendor, COUNT(*) as cnt FROM dp_cabinet_pricing GROUP BY vendor"
);
for (const s of summary) {
  console.log(`  ${s.vendor}: ${s.cnt} rows (${s.cnt / 3} options)`);
}

await pool.end();
console.log("\n✅ Cabinet pricing import complete!");
