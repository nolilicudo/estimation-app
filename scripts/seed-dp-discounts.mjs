/**
 * Seed script: insert default early-bird and same-day discount rows
 * for the design_package_discounts table.
 *
 * Run: node scripts/seed-dp-discounts.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const defaults = [
  {
    discountType: "early_bird",
    name: "Early Bird Discount",
    discountPct: "5.00",
    isActive: 1,
  },
  {
    discountType: "same_day",
    name: "Same Day Discount",
    discountPct: "10.00",
    isActive: 1,
  },
];

for (const row of defaults) {
  await conn.execute(
    `INSERT INTO design_package_discounts (discountType, name, discountPct, isActive)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       discountPct = VALUES(discountPct),
       isActive = VALUES(isActive)`,
    [row.discountType, row.name, row.discountPct, row.isActive]
  );
  console.log(`✓ Seeded: ${row.name} (${row.discountPct}%)`);
}

await conn.end();
console.log("Done.");
