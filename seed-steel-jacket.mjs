/**
 * Seed script: Insert default "A Steel Jacket" waterproofing option
 * Run: node seed-steel-jacket.mjs
 */
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const PHOTO_URLS = [
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_01_underside_ceiling_51e76e8f.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_02_underside_wide_61591a06.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_03_exterior_white_de14ac68.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_04_exterior_mountain_view_58290df3.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_05_silver_panels_mountain_82b80726.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_06_silver_panels_valley_view_f95e71cd.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_07_gray_panels_hot_tub_07670699.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_08_white_panels_installation_38d6eb18.jpeg",
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/steel_jacket_09_tan_panels_exterior_rocks_2f4bac34.jpeg",
];

async function seed() {
  const conn = await createConnection(process.env.DATABASE_URL);

  // Check if already seeded
  const [existing] = await conn.execute("SELECT id FROM steel_jacket_options WHERE slug = 'steel-jacket-standard' LIMIT 1");
  if (existing.length > 0) {
    console.log("A Steel Jacket option already exists, skipping seed.");
    await conn.end();
    return;
  }

  await conn.execute(
    `INSERT INTO steel_jacket_options 
      (slug, name, description, materialCostPerSqft, installCostPerSqft, marginPct, pricePerSqft, photoUrls, sortOrder, isActive)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "steel-jacket-standard",
      "A Steel Jacket",
      "Premium steel panel under-deck waterproofing system for the Appalachian collection. Creates a dry, usable space beneath your deck with concealed drainage and a clean finished appearance.",
      "0.00",
      "0.00",
      "35.00",
      "0.00",
      JSON.stringify(PHOTO_URLS),
      1,
      1,
    ]
  );

  console.log("✓ A Steel Jacket option seeded successfully.");
  console.log("  → Set pricing in Admin → Scope → Steel Jacket tab.");
  await conn.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
