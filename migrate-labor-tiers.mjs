/**
 * Migration: Split shared labor tiers into collection-specific tiers.
 * - Existing tiers (collectionSlug = null) → set to collectionSlug = 'rainier'
 * - Create Appalachian copies of each tier with pricePerSqft + $4.00
 *
 * Run: node migrate-labor-tiers.mjs
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
  const conn = await createConnection(process.env.DATABASE_URL);

  // 1. Get all current shared tiers (collectionSlug IS NULL)
  const [sharedTiers] = await conn.execute(
    "SELECT * FROM labor_tiers WHERE collectionSlug IS NULL ORDER BY sortOrder"
  );

  if (sharedTiers.length === 0) {
    console.log("No shared tiers found — already migrated or nothing to do.");
    await conn.end();
    return;
  }

  console.log(`Found ${sharedTiers.length} shared tiers to migrate:`);
  for (const t of sharedTiers) {
    console.log(`  [${t.id}] ${t.name} — $${t.pricePerSqft}/sqft`);
  }

  // 2. Check if Appalachian tiers already exist
  const [existingApp] = await conn.execute(
    "SELECT id FROM labor_tiers WHERE collectionSlug = 'appalachian' LIMIT 1"
  );
  if (existingApp.length > 0) {
    console.log("\nAppalachian tiers already exist — skipping Appalachian creation.");
    console.log("Only updating shared tiers to Rainier...");
  }

  // 3. Set existing shared tiers to Rainier
  await conn.execute(
    "UPDATE labor_tiers SET collectionSlug = 'rainier' WHERE collectionSlug IS NULL"
  );
  console.log(`\n✓ Updated ${sharedTiers.length} tiers → collectionSlug = 'rainier'`);

  // 4. Create Appalachian copies with +$4/sqft (skip if already exist)
  if (existingApp.length === 0) {
    for (const t of sharedTiers) {
      const appSlug = `${t.slug}-appalachian`;
      const appPrice = (parseFloat(t.pricePerSqft) + 4.0).toFixed(2);
      const appName = t.name; // same display name
      await conn.execute(
        `INSERT INTO labor_tiers 
          (slug, name, description, pricePerSqft, laborCostPerSqft, marginPercent, minimumPrice, sortOrder, isActive, collectionSlug)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'appalachian')`,
        [
          appSlug,
          appName,
          t.description,
          appPrice,
          t.laborCostPerSqft,
          t.marginPercent,
          t.minimumPrice,
          t.sortOrder,
          t.isActive,
        ]
      );
      console.log(`✓ Created Appalachian tier: ${appName} — $${appPrice}/sqft (was $${t.pricePerSqft})`);
    }
  }

  console.log("\n✅ Migration complete.");
  console.log("   Rainier tiers: unchanged prices");
  console.log("   Appalachian tiers: +$4.00/sqft on all levels");
  await conn.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
