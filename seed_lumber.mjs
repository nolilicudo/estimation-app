/**
 * Seed script: inserts Pressure Treated and Doug Fir Dimensional lumber items
 * into the lumber_items table with their Home Depot Lindon store SKUs and
 * current prices fetched from the SerpApi lookup.
 *
 * Run with: node seed_lumber.mjs
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Items from the SerpApi lookup — verified and corrected where the search
// returned a mismatched product (marked with NOTE).
// NOTE: Some PT sizes (2x12, 4x4x12, 6x6x10) had mismatches — SKUs left blank
// for manual entry in admin; prices set to 0 until synced.
const ITEMS = [
  // ─── Pressure Treated ────────────────────────────────────────────────────
  { name: "2x4x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 7.38,  homeDepotSku: "206931753" },
  { name: "2x4x10 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 9.38,  homeDepotSku: "206931754" },
  { name: "2x4x12 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 12.08, homeDepotSku: "206931755" },
  { name: "2x6x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 11.88, homeDepotSku: "206931757" },
  { name: "2x6x10 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 14.88, homeDepotSku: "206931768" },
  { name: "2x6x12 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 17.98, homeDepotSku: "206931769" },
  { name: "2x6x16 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 22.38, homeDepotSku: "206931770" },
  { name: "2x8x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 16.18, homeDepotSku: "206931771" },
  { name: "2x8x10 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 19.78, homeDepotSku: "206931772" },
  { name: "2x8x12 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 23.68, homeDepotSku: "206931773" },
  { name: "2x8x16 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 31.68, homeDepotSku: "206931774" },
  { name: "2x10x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 21.88, homeDepotSku: "206931775" },
  { name: "2x10x10 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 27.48, homeDepotSku: "206931776" },
  { name: "2x10x12 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 32.78, homeDepotSku: "206931777" },
  { name: "2x10x16 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 43.68, homeDepotSku: "206931778" },
  { name: "2x12x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 0,     homeDepotSku: null },  // not found — enter SKU manually
  { name: "2x12x12 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 0,     homeDepotSku: null },  // mismatch — enter SKU manually
  { name: "2x12x16 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 0,     homeDepotSku: null },  // mismatch — enter SKU manually
  { name: "4x4x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 15.58, homeDepotSku: "100043699" },
  { name: "4x4x10 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 22.88, homeDepotSku: "100025659" },
  { name: "4x4x12 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 0,     homeDepotSku: null },  // mismatch — enter SKU manually
  { name: "4x6x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 31.18, homeDepotSku: "100026471" },
  { name: "6x6x8 PT #2 Ground Contact",  category: "Pressure Treated", unit: "each", costPrice: 46.58, homeDepotSku: "100044273" },
  { name: "6x6x10 PT #2 Ground Contact", category: "Pressure Treated", unit: "each", costPrice: 0,     homeDepotSku: null },  // mismatch — enter SKU manually

  // ─── Doug Fir Dimensional ────────────────────────────────────────────────
  { name: "2x4x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 3.98,  homeDepotSku: "312528776" },
  { name: "2x4x10 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 7.28,  homeDepotSku: "313824028" },
  { name: "2x4x12 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 8.66,  homeDepotSku: "202094183" },
  { name: "2x6x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 8.42,  homeDepotSku: "333311570" },
  { name: "2x6x10 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 10.16, homeDepotSku: "333311970" },
  { name: "2x6x12 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 12.22, homeDepotSku: "206019465" },
  { name: "2x6x16 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 16.82, homeDepotSku: "206019467" },
  { name: "2x8x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 11.22, homeDepotSku: "329444946" },
  { name: "2x8x10 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 14.12, homeDepotSku: "204667922" },
  { name: "2x8x12 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 16.82, homeDepotSku: "206182009" },
  { name: "2x8x16 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 22.44, homeDepotSku: "206182011" },
  { name: "2x10x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 16.47, homeDepotSku: "206182030" },
  { name: "2x10x10 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 20.58, homeDepotSku: "206182034" },
  { name: "2x10x12 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 20.58, homeDepotSku: "206182035" },  // using closest match
  { name: "2x10x16 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 32.94, homeDepotSku: "206182037" },
  { name: "2x12x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 17.68, homeDepotSku: "202094201" },
  { name: "2x12x12 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 22.12, homeDepotSku: "202094202" },
  { name: "2x12x16 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 51.38, homeDepotSku: "206931782" },
  { name: "4x4x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 10.63, homeDepotSku: "202094374" },
  { name: "4x4x10 Doug Fir #2", category: "Doug Fir Dimensional", unit: "each", costPrice: 13.32, homeDepotSku: "202047663" },
  { name: "4x6x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 14.64, homeDepotSku: "316602427" },
  { name: "6x6x8 Doug Fir #2",  category: "Doug Fir Dimensional", unit: "each", costPrice: 46.58, homeDepotSku: "100044273" },
];

const MARKUP = 1.3; // 30% markup — matches default markupMultiplier

let inserted = 0;
let sortOrders = {};

for (const item of ITEMS) {
  const cat = item.category;
  if (!sortOrders[cat]) {
    // Get current max sortOrder for this category
    const [rows] = await conn.execute(
      "SELECT COALESCE(MAX(sortOrder), 0) AS maxSort FROM lumber_items WHERE category = ?",
      [cat]
    );
    sortOrders[cat] = rows[0].maxSort;
  }
  sortOrders[cat]++;

  const displayPrice = item.costPrice > 0
    ? parseFloat((item.costPrice * MARKUP).toFixed(2))
    : 0;

  await conn.execute(
    `INSERT INTO lumber_items
       (name, description, unit, costPrice, markupMultiplier, displayPrice,
        category, sortOrder, isActive, homeDepotSku, lastSyncedPrice, lastSyncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      item.name,
      `Home Depot Lindon #4407 — ${item.name}`,
      item.unit,
      item.costPrice.toFixed(2),
      MARKUP.toFixed(3),
      displayPrice.toFixed(2),
      cat,
      sortOrders[cat],
      item.homeDepotSku ?? null,
      item.costPrice > 0 ? item.costPrice.toFixed(2) : null,
      item.costPrice > 0 ? new Date() : null,
    ]
  );
  inserted++;
  console.log(`  [${inserted}] ${item.name} — $${item.costPrice} → display $${displayPrice} (SKU: ${item.homeDepotSku ?? "MISSING"})`);
}

await conn.end();
console.log(`\nDone. Inserted ${inserted} lumber items.`);
