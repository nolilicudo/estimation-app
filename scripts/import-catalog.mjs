/**
 * Import all 500 catalog items from DesignYourPriceCatelog.xlsx
 * into the dp_catalog_items table.
 *
 * Run: node scripts/import-catalog.mjs
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, "../.env");
try {
  const env = readFileSync(envPath, "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

const xlsxPath = join(__dirname, "../../upload/DesignYourPriceCatelog(5).xlsx");
const wb = XLSX.readFile(xlsxPath);

// ─── Normalize unit strings ───────────────────────────────────────────────────
function normalizeUnit(raw) {
  if (!raw) return "each";
  const u = String(raw).toLowerCase().trim();
  if (u.includes("square foot") || u.includes("sq ft") || u === "sqft") return "sqft";
  if (u.includes("linear foot") || u.includes("linear feet") || u.includes("lineal") || u === "lf") return "lf";
  if (u === "square" || u === "squares") return "square";
  if (u.includes("cubic yard") || u === "cy") return "cy";
  if (u.includes("lump sum") || u === "ls") return "ls";
  if (u.includes("hour")) return "hour";
  if (u.includes("day")) return "day";
  if (u.includes("ton")) return "ton";
  return "each";
}

// ─── Parse a number from a cell value ────────────────────────────────────────
function parseNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

// ─── Collect all items ────────────────────────────────────────────────────────
const items = [];

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Must have a product name
    const name = row["Product Option"] || row["Name"] || row["Item"];
    if (!name || String(name).trim() === "") continue;

    const category = row["Category"] ? String(row["Category"]).trim() : null;
    const unit = normalizeUnit(row["Per"] || row["Unit"]);
    const productLink = row["Product Link"] ? String(row["Product Link"]).trim() : null;

    // Labor / material / cost
    let laborCost = null;
    let materialCost = null;
    let estimatedPrice = null;
    let marginPct = 37.5;
    let electricalContext = null;
    let minimumPrice = null;

    if (sheetName === "Electrical") {
      // Three pricing columns: New Construction, Changes, Post-Drywall
      // Import as three separate rows
      const nc = parseNum(row["New Construction"]);
      const ch = parseNum(row["Changes"]);
      const pd = parseNum(row["Post-Drywall"]);

      const contexts = [
        { ctx: "new_construction", price: nc },
        { ctx: "changes", price: ch },
        { ctx: "post_drywall", price: pd },
      ];

      for (const { ctx, price } of contexts) {
        if (price === null) continue;
        items.push({
          tradeSheet: sheetName,
          category,
          name: String(name).trim(),
          unit,
          laborCost: price,
          materialCost: 0,
          marginPct: 37.5,
          estimatedPrice: price,
          minimumPrice: 0,
          productLink,
          electricalContext: ctx,
          notes: null,
        });
      }
      continue; // skip the generic push below
    }

    // Standard sheets
    laborCost = parseNum(row["Estimated Labor"]);
    materialCost = parseNum(row["Estimated Materials"]);
    estimatedPrice = parseNum(row["Estimated Cost"]);
    minimumPrice = parseNum(row["Minimum"] || row["Minimum Price"]);

    const rawMargin = parseNum(row["Profit"]);
    if (rawMargin !== null) {
      // Stored as decimal (0.375) or percent (37.5)
      let pct = rawMargin < 1 ? rawMargin * 100 : rawMargin;
      // Clamp to valid decimal(5,2) range: 0.00 to 99.99
      marginPct = Math.min(99.99, Math.max(0, pct));
    }

    // If no estimatedPrice but we have labor+material, compute it
    if (estimatedPrice === null && laborCost !== null) {
      estimatedPrice = (laborCost || 0) + (materialCost || 0);
    }

    items.push({
      tradeSheet: sheetName,
      category,
      name: String(name).trim(),
      unit,
      laborCost: laborCost ?? 0,
      materialCost: materialCost ?? 0,
      marginPct,
      estimatedPrice: estimatedPrice ?? 0,
      minimumPrice: minimumPrice ?? 0,
      productLink,
      electricalContext: null,
      notes: null,
    });
  }
}

console.log(`Parsed ${items.length} catalog items`);

// ─── Insert into database ─────────────────────────────────────────────────────
const conn = await createConnection(DB_URL);

// Clear existing catalog items
await conn.execute("DELETE FROM dp_catalog_items");
console.log("Cleared existing catalog items");

let inserted = 0;
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  await conn.execute(
    `INSERT INTO dp_catalog_items
      (tradeSheet, category, name, unit, laborCost, materialCost, marginPct,
       estimatedPrice, minimumPrice, productLink, electricalContext, notes, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.tradeSheet,
      item.category,
      item.name,
      item.unit,
      item.laborCost,
      item.materialCost,
      item.marginPct,
      item.estimatedPrice,
      item.minimumPrice,
      item.productLink,
      item.electricalContext,
      item.notes,
      i,
    ]
  );
  inserted++;
}

console.log(`Inserted ${inserted} catalog items`);
await conn.end();
