import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// First, see what railing options exist
const [existing] = await conn.execute("SELECT id, name, colorVariant FROM railing_options ORDER BY sortOrder");
console.log("Existing railing options:", JSON.stringify(existing, null, 2));

// For each existing railing option that has no colorVariant, we'll create 3 color variants
// (white, black, stainless) by duplicating the row, then set the original to null (color-agnostic)
// OR we can just add colorVariant = null to existing rows and let the admin set colors.
// 
// Strategy: for each existing active railing option, create 2 additional color variants
// (keeping the original as "stainless" or null), then add white and black variants.

for (const row of existing) {
  if (row.colorVariant !== null) {
    console.log(`Skipping ${row.name} — already has colorVariant: ${row.colorVariant}`);
    continue;
  }
  
  // Get full row data
  const [fullRows] = await conn.execute("SELECT * FROM railing_options WHERE id = ?", [row.id]);
  const full = fullRows[0];
  
  // Update original to be "stainless" variant
  await conn.execute("UPDATE railing_options SET colorVariant = 'stainless', name = ? WHERE id = ?", [
    `${full.name} — Stainless`,
    full.id
  ]);
  console.log(`Updated ${full.name} → stainless`);
  
  // Insert white variant
  await conn.execute(
    `INSERT INTO railing_options (name, railingType, orientation, description, pricePerLf, costPerLf, installCostPerLf, marginPct, colorVariant, sortOrder, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'white', ?, ?)`,
    [
      `${full.name.replace(/ — Stainless$/, "")} — White`,
      full.railingType,
      full.orientation,
      full.description,
      full.pricePerLf,
      full.costPerLf,
      full.installCostPerLf,
      full.marginPct,
      full.sortOrder + 1,
      full.isActive,
    ]
  );
  console.log(`Inserted white variant for ${full.name}`);
  
  // Insert black variant
  await conn.execute(
    `INSERT INTO railing_options (name, railingType, orientation, description, pricePerLf, costPerLf, installCostPerLf, marginPct, colorVariant, sortOrder, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'black', ?, ?)`,
    [
      `${full.name.replace(/ — Stainless$/, "")} — Black`,
      full.railingType,
      full.orientation,
      full.description,
      full.pricePerLf,
      full.costPerLf,
      full.installCostPerLf,
      full.marginPct,
      full.sortOrder + 2,
      full.isActive,
    ]
  );
  console.log(`Inserted black variant for ${full.name}`);
}

const [final] = await conn.execute("SELECT id, name, colorVariant, pricePerLf FROM railing_options ORDER BY sortOrder, id");
console.log("\nFinal railing options:");
console.table(final);

await conn.end();
console.log("Done!");
