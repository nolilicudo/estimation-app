import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding Resin Rock, Duradek, and Tiledek data...");

  // ── Resin Rock Surfaces ──
  await db.execute(sql`DELETE FROM resin_surfaces`);
  const surfaces = [
    { slug: "concrete-slab", name: "Concrete Slab", description: "Existing concrete patio, driveway, or pool deck. Ideal surface for resin bound overlay.", pricePerSqft: "12.50", requiresWaterproofing: 0, sortOrder: 1 },
    { slug: "asphalt", name: "Asphalt", description: "Existing asphalt surface. Resin bound applies directly over cleaned asphalt.", pricePerSqft: "13.00", requiresWaterproofing: 0, sortOrder: 2 },
    { slug: "plywood-subfloor", name: "Plywood / OSB Subfloor", description: "Wood deck subfloor requiring waterproof membrane before resin application.", pricePerSqft: "14.50", requiresWaterproofing: 1, sortOrder: 3 },
    { slug: "existing-tile", name: "Existing Tile", description: "Overlay on existing tile surface. May require surface prep and priming.", pricePerSqft: "13.50", requiresWaterproofing: 0, sortOrder: 4 },
    { slug: "rock-crete", name: "Rock Crete System", description: "Resin Rock's proprietary permeable base system — compacted road base with mesh and resin stone layers. Replaces concrete.", pricePerSqft: "18.00", requiresWaterproofing: 0, sortOrder: 5 },
    { slug: "wood-deck-boards", name: "Existing Wood Deck Boards", description: "Existing wood deck surface. Requires waterproof membrane and may need re-sheeting with plywood.", pricePerSqft: "16.00", requiresWaterproofing: 1, sortOrder: 6 },
  ];
  for (const s of surfaces) {
    await db.execute(sql`INSERT INTO resin_surfaces (slug, name, description, pricePerSqft, requiresWaterproofing, sortOrder) VALUES (${s.slug}, ${s.name}, ${s.description}, ${s.pricePerSqft}, ${s.requiresWaterproofing}, ${s.sortOrder})`);
  }
  console.log(`  ✓ ${surfaces.length} resin surfaces`);

  // ── Resin Rock Colors ──
  await db.execute(sql`DELETE FROM resin_colors`);
  const resinColors = [
    // Primary colors
    { slug: "black", name: "Black", hex: "#1a1a1a", category: "primary", pricePerSqft: "12.50", sortOrder: 1 },
    { slug: "blue-grey-marble", name: "Blue Grey Marble", hex: "#7B8B9E", category: "primary", pricePerSqft: "12.50", sortOrder: 2 },
    { slug: "caramel-marble", name: "Caramel Marble", hex: "#C4956A", category: "primary", pricePerSqft: "12.50", sortOrder: 3 },
    { slug: "classic-white", name: "Classic White", hex: "#F0EDE8", category: "primary", pricePerSqft: "12.50", sortOrder: 4 },
    { slug: "dark-grey-marble", name: "Dark Grey Marble", hex: "#5A5A5A", category: "primary", pricePerSqft: "12.50", sortOrder: 5 },
    { slug: "ivory-cream-marble", name: "Ivory Cream Marble", hex: "#E8DCC8", category: "primary", pricePerSqft: "12.50", sortOrder: 6 },
    { slug: "light-grey", name: "Light Grey", hex: "#B0B0B0", category: "primary", pricePerSqft: "12.50", sortOrder: 7 },
    { slug: "pink", name: "Pink", hex: "#D4A0A0", category: "primary", pricePerSqft: "12.50", sortOrder: 8 },
    { slug: "red-marble", name: "Red Marble", hex: "#A0413C", category: "primary", pricePerSqft: "12.50", sortOrder: 9 },
    { slug: "spanish-quartz", name: "Spanish Quartz Marble", hex: "#C8B89A", category: "primary", pricePerSqft: "12.50", sortOrder: 10 },
    { slug: "special-white", name: "Special White", hex: "#FAFAFA", category: "primary", pricePerSqft: "13.00", sortOrder: 11 },
    // Blend colors
    { slug: "aspen", name: "Aspen", hex: "#D4C5A9", category: "blend", pricePerSqft: "14.00", sortOrder: 12 },
    { slug: "capri", name: "Capri", hex: "#8EAAB5", category: "blend", pricePerSqft: "14.00", sortOrder: 13 },
    { slug: "manhattan", name: "Manhattan", hex: "#9E9080", category: "blend", pricePerSqft: "14.00", sortOrder: 14 },
    { slug: "marrakesh", name: "Marrakesh", hex: "#C4784A", category: "blend", pricePerSqft: "14.00", sortOrder: 15 },
    { slug: "sahara", name: "Sahara", hex: "#D4B896", category: "blend", pricePerSqft: "14.00", sortOrder: 16 },
    { slug: "venice", name: "Venice", hex: "#B8A88A", category: "blend", pricePerSqft: "14.00", sortOrder: 17 },
    { slug: "tuscany", name: "Tuscany", hex: "#C09060", category: "blend", pricePerSqft: "14.00", sortOrder: 18 },
    { slug: "riviera", name: "Riviera", hex: "#7A9BAE", category: "blend", pricePerSqft: "14.00", sortOrder: 19 },
    { slug: "monaco", name: "Monaco", hex: "#6B6B6B", category: "blend", pricePerSqft: "14.00", sortOrder: 20 },
  ];
  for (const c of resinColors) {
    await db.execute(sql`INSERT INTO resin_colors (slug, name, hex, category, pricePerSqft, sortOrder) VALUES (${c.slug}, ${c.name}, ${c.hex}, ${c.category}, ${c.pricePerSqft}, ${c.sortOrder})`);
  }
  console.log(`  ✓ ${resinColors.length} resin colors`);

  // ── Waterproofing Options ──
  await db.execute(sql`DELETE FROM waterproofing_options`);
  const wpOptions = [
    { slug: "rubber-membrane-standard", name: "Poured Rubber Membrane — Standard", description: "Standard poured-on rubber membrane waterproofing. Single coat application for basic waterproof protection.", pricePerSqft: "3.50", sortOrder: 1 },
    { slug: "rubber-membrane-premium", name: "Poured Rubber Membrane — Premium", description: "Premium double-coat poured rubber membrane with reinforced mesh. Maximum waterproof protection for occupied spaces below.", pricePerSqft: "5.00", sortOrder: 2 },
  ];
  for (const w of wpOptions) {
    await db.execute(sql`INSERT INTO waterproofing_options (slug, name, description, pricePerSqft, sortOrder) VALUES (${w.slug}, ${w.name}, ${w.description}, ${w.pricePerSqft}, ${w.sortOrder})`);
  }
  console.log(`  ✓ ${wpOptions.length} waterproofing options`);

  // ── Duradek Colors ──
  await db.execute(sql`DELETE FROM duradek_colors`);
  const duradekColors = [
    // Ultra Quartz Series
    { slug: "mountain-quartz", name: "Mountain Quartz", series: "Ultra Quartz", hex: "#8B8578", pricePerSqft: "10.00", sortOrder: 1 },
    { slug: "arctic-quartz", name: "Arctic Quartz", series: "Ultra Quartz", hex: "#C8C4BC", pricePerSqft: "10.00", sortOrder: 2 },
    { slug: "desert-quartz", name: "Desert Quartz", series: "Ultra Quartz", hex: "#C4B49A", pricePerSqft: "10.00", sortOrder: 3 },
    { slug: "canyon-quartz", name: "Canyon Quartz", series: "Ultra Quartz", hex: "#A08870", pricePerSqft: "10.00", sortOrder: 4 },
    // Ultra Legacy Series
    { slug: "legacy-cottonwood", name: "Legacy Cottonwood", series: "Ultra Legacy", hex: "#B8A890", pricePerSqft: "9.00", sortOrder: 5 },
    { slug: "legacy-driftwood", name: "Legacy Driftwood", series: "Ultra Legacy", hex: "#9E8E78", pricePerSqft: "9.00", sortOrder: 6 },
    { slug: "legacy-barnwood", name: "Legacy Barnwood", series: "Ultra Legacy", hex: "#7A6A58", pricePerSqft: "9.00", sortOrder: 7 },
    { slug: "legacy-cedarwood", name: "Legacy Cedarwood", series: "Ultra Legacy", hex: "#8B6B4A", pricePerSqft: "9.00", sortOrder: 8 },
    { slug: "legacy-pebble-beach", name: "Legacy Pebble Beach", series: "Ultra Legacy", hex: "#A09888", pricePerSqft: "9.00", sortOrder: 9 },
    // Ultra Cork Series
    { slug: "cork-espresso", name: "Cork Espresso", series: "Ultra Cork", hex: "#4A3828", pricePerSqft: "9.00", sortOrder: 10 },
    { slug: "cork-macchiato", name: "Cork Macchiato", series: "Ultra Cork", hex: "#8A7560", pricePerSqft: "9.00", sortOrder: 11 },
    { slug: "cork-graphite", name: "Cork Graphite", series: "Ultra Cork", hex: "#5A5550", pricePerSqft: "9.00", sortOrder: 12 },
    // Ultra Heritage Series
    { slug: "heritage-agate", name: "Heritage Agate", series: "Ultra Heritage", hex: "#7A7068", pricePerSqft: "9.00", sortOrder: 13 },
    { slug: "heritage-sienna", name: "Heritage Sienna", series: "Ultra Heritage", hex: "#9A7A5A", pricePerSqft: "9.00", sortOrder: 14 },
    // Ultra Supreme Chip Series
    { slug: "supreme-chip-granite", name: "Supreme Chip Granite", series: "Ultra Supreme Chip", hex: "#787878", pricePerSqft: "9.00", sortOrder: 15 },
    { slug: "supreme-chip-sonoma", name: "Supreme Chip Sonoma", series: "Ultra Supreme Chip", hex: "#A09080", pricePerSqft: "9.00", sortOrder: 16 },
    { slug: "supreme-chip-taupe", name: "Supreme Chip Taupe", series: "Ultra Supreme Chip", hex: "#8A8070", pricePerSqft: "9.00", sortOrder: 17 },
    // Ultra Classic Series
    { slug: "classic-sandstone", name: "Classic Sandstone", series: "Ultra Classic", hex: "#C8B898", pricePerSqft: "8.50", sortOrder: 18 },
    { slug: "classic-steel", name: "Classic Steel", series: "Ultra Classic", hex: "#6A6A70", pricePerSqft: "8.50", sortOrder: 19 },
    // Ultra Surcoseal Series
    { slug: "surcoseal-suede", name: "Surcoseal Suede", series: "Ultra Surcoseal", hex: "#B0A090", pricePerSqft: "8.00", sortOrder: 20 },
    { slug: "surcoseal-grey", name: "Surcoseal Grey", series: "Ultra Surcoseal", hex: "#808080", pricePerSqft: "8.00", sortOrder: 21 },
    // Ultra Okanagan Series
    { slug: "okanagan-flint", name: "Okanagan Flint", series: "Ultra Okanagan", hex: "#6E6860", pricePerSqft: "8.50", sortOrder: 22 },
    { slug: "okanagan-leather", name: "Okanagan Leather", series: "Ultra Okanagan", hex: "#8A6A4A", pricePerSqft: "8.50", sortOrder: 23 },
    { slug: "okanagan-linen", name: "Okanagan Linen", series: "Ultra Okanagan", hex: "#C0B8A8", pricePerSqft: "8.50", sortOrder: 24 },
  ];
  for (const d of duradekColors) {
    await db.execute(sql`INSERT INTO duradek_colors (slug, name, series, hex, pricePerSqft, sortOrder) VALUES (${d.slug}, ${d.name}, ${d.series}, ${d.hex}, ${d.pricePerSqft}, ${d.sortOrder})`);
  }
  console.log(`  ✓ ${duradekColors.length} duradek colors`);

  // ── Tile Sizes ──
  await db.execute(sql`DELETE FROM tile_sizes`);
  const tileSizes = [
    { slug: "small-6x6", name: "Small (6\" × 6\")", description: "Small format tiles — more cuts, more grout lines, higher labor intensity", laborPerSqft: "12.00", materialPerSqft: "5.50", sortOrder: 1 },
    { slug: "medium-12x12", name: "Medium (12\" × 12\")", description: "Standard format tiles — balanced labor and material efficiency", laborPerSqft: "10.00", materialPerSqft: "6.00", sortOrder: 2 },
    { slug: "large-18x18", name: "Large (18\" × 18\")", description: "Large format tiles — fewer cuts, faster coverage, requires careful leveling", laborPerSqft: "9.00", materialPerSqft: "7.50", sortOrder: 3 },
    { slug: "xlarge-24x24", name: "Extra Large (24\" × 24\")", description: "Extra large format — premium look, requires precision leveling and lippage control", laborPerSqft: "10.50", materialPerSqft: "9.00", sortOrder: 4 },
    { slug: "plank-6x24", name: "Plank / Wood-Look (6\" × 24\")", description: "Wood-look plank tiles — pattern layout, more cuts, popular for deck aesthetics", laborPerSqft: "11.00", materialPerSqft: "7.00", sortOrder: 5 },
    { slug: "plank-8x48", name: "Large Plank (8\" × 48\")", description: "Large format plank tiles — dramatic wood-look, requires experienced installer", laborPerSqft: "12.50", materialPerSqft: "8.50", sortOrder: 6 },
    { slug: "mosaic", name: "Mosaic (2\" × 2\" sheets)", description: "Mosaic tile sheets — decorative accent, highest labor for alignment and grouting", laborPerSqft: "14.00", materialPerSqft: "8.00", sortOrder: 7 },
  ];
  for (const t of tileSizes) {
    await db.execute(sql`INSERT INTO tile_sizes (slug, name, description, laborPerSqft, materialPerSqft, sortOrder) VALUES (${t.slug}, ${t.name}, ${t.description}, ${t.laborPerSqft}, ${t.materialPerSqft}, ${t.sortOrder})`);
  }
  console.log(`  ✓ ${tileSizes.length} tile sizes`);

  // ── Product Settings ──
  await db.execute(sql`DELETE FROM product_settings`);
  const productSettings = [
    // Resin Rock settings
    { productType: "resin_rock", settingKey: "base_labor_per_sqft", settingValue: "6.00", label: "Base Installation Labor (per sqft)", description: "Base labor cost for resin rock installation per square foot" },
    { productType: "resin_rock", settingKey: "surface_prep_per_sqft", settingValue: "1.50", label: "Surface Prep (per sqft)", description: "Cost for cleaning, priming, and preparing the surface" },
    { productType: "resin_rock", settingKey: "hero_title", settingValue: "Resin Rock Stone Surfacing", label: "Hero Title", description: "Main heading for the Resin Rock calculator" },
    { productType: "resin_rock", settingKey: "hero_subtitle", settingValue: "Cost Calculator", label: "Hero Subtitle", description: "Subtitle for the Resin Rock calculator" },
    { productType: "resin_rock", settingKey: "hero_description", settingValue: "Get an instant estimate for premium resin bound stone surfacing. Seamless, permeable, UV-stable, and available in 30+ color blends.", label: "Hero Description", description: "Description text for the Resin Rock hero section" },
    // Duradek settings
    { productType: "duradek", settingKey: "base_labor_per_sqft", settingValue: "5.00", label: "Base Installation Labor (per sqft)", description: "Base labor cost for Duradek membrane installation per square foot" },
    { productType: "duradek", settingKey: "hero_title", settingValue: "Duradek Waterproof Decking", label: "Hero Title", description: "Main heading for the Duradek calculator" },
    { productType: "duradek", settingKey: "hero_subtitle", settingValue: "Cost Calculator", label: "Hero Subtitle", description: "Subtitle for the Duradek calculator" },
    { productType: "duradek", settingKey: "hero_description", settingValue: "Get an instant estimate for Duradek vinyl waterproof decking membrane. 15-year warranty, 24 stunning print colors, and complete waterproof protection.", label: "Hero Description", description: "Description text for the Duradek hero section" },
    // Tiledek settings
    { productType: "tiledek", settingKey: "membrane_per_sqft", settingValue: "5.00", label: "Tiledek Membrane (per sqft)", description: "Cost for Tiledek waterproofing membrane per square foot installed" },
    { productType: "tiledek", settingKey: "mortar_per_sqft", settingValue: "2.00", label: "Mapei Grani-Rapid Mortar (per sqft)", description: "Cost for Mapei Grani-Rapid latex hydraulic mortar per square foot" },
    { productType: "tiledek", settingKey: "grout_per_sqft", settingValue: "0.75", label: "Grout (per sqft)", description: "Cost for grouting per square foot" },
    { productType: "tiledek", settingKey: "hero_title", settingValue: "Tiledek Tile Decking", label: "Hero Title", description: "Main heading for the Tiledek calculator" },
    { productType: "tiledek", settingKey: "hero_subtitle", settingValue: "Cost Calculator", label: "Hero Subtitle", description: "Subtitle for the Tiledek calculator" },
    { productType: "tiledek", settingKey: "hero_description", settingValue: "Get an instant estimate for waterproof tile decking with Tiledek membrane and Mapei Grani-Rapid mortar. Choose your tile size for accurate pricing.", label: "Hero Description", description: "Description text for the Tiledek hero section" },
  ];
  for (const p of productSettings) {
    await db.execute(sql`INSERT INTO product_settings (productType, settingKey, settingValue, label, description) VALUES (${p.productType}, ${p.settingKey}, ${p.settingValue}, ${p.label}, ${p.description})`);
  }
  console.log(`  ✓ ${productSettings.length} product settings`);

  console.log("\n✅ All product data seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
