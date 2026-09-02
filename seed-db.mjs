import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding database...");

  // Collections
  await db.execute(sql`INSERT INTO collections (slug, name, description, features, imageUrl, sortOrder, isActive) VALUES
    ('rainier', 'Rainier Collection', 'Waterproof stone decking system with free-floating installation. Perfect for both indoor and outdoor settings with EPDM membrane waterproofing.', '["Waterproof installation","Free-floating system","Indoor & outdoor use","EPDM membrane included","8 color options"]', 'https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/rainier-showcase-nuMkxWfFrs2SZqW9tKKMJs.webp', 1, 1),
    ('appalachian', 'Appalachian Collection', 'Hidden fastener stone decking system installed directly against the deck frame. No visible screws for a clean, seamless look.', '["Hidden fastener system","No visible screws","Direct frame installation","Clean seamless look","5 color options"]', 'https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/appalachian-showcase-kgKo6qqGNxKY5xXDq3b35L.webp', 2, 1)
    ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  console.log("  ✓ Collections");

  // Get collection IDs
  const result = await db.execute(sql`SELECT id, slug FROM collections`);
  const colMap = {};
  const rows = Array.isArray(result[0]) ? result[0] : result;
  for (const r of rows) {
    colMap[r.slug] = r.id;
  }
  console.log('  Collection map:', colMap);

  // Colors - Rainier
  const rainierColors = [
    ["aged-teak", "Aged Teak", "#8B7355", 11.95, 1],
    ["american-walnut", "American Walnut", "#5C4033", 12.23, 2],
    ["carrara-marble", "Carrara Marble", "#D4D2CF", 11.95, 3],
    ["sierra-grey", "Sierra Grey", "#9E9E9E", 11.95, 4],
    ["slate-black", "Slate Black", "#3D3D3D", 12.23, 5],
    ["driftwood", "Driftwood", "#A89F91", 11.95, 6],
    ["travertine", "Travertine", "#C8B99A", 11.95, 7],
    ["canyon-brown", "Canyon Brown", "#7B5B3A", 11.95, 8],
  ];

  for (const [slug, name, hex, price, order] of rainierColors) {
    await db.execute(sql`INSERT INTO colors (collectionId, slug, name, hex, pricePerSqft, sortOrder, isActive) VALUES (${colMap.rainier}, ${slug}, ${name}, ${hex}, ${price}, ${order}, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  }

  // Colors - Appalachian
  const appColors = [
    ["white-ash", "White Ash", "#C8BEB0", 10.99, 1],
    ["american-walnut-app", "American Walnut", "#5C4033", 10.99, 2],
    ["aged-teak-app", "Aged Teak", "#8B7355", 10.99, 3],
    ["silver-maple", "Silver Maple", "#B0A898", 10.99, 4],
    ["driftwood-app", "Driftwood", "#A89F91", 10.99, 5],
  ];

  for (const [slug, name, hex, price, order] of appColors) {
    await db.execute(sql`INSERT INTO colors (collectionId, slug, name, hex, pricePerSqft, sortOrder, isActive) VALUES (${colMap.appalachian}, ${slug}, ${name}, ${hex}, ${price}, ${order}, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  }
  console.log("  ✓ Colors");

  // Edge options
  const edges = [
    ["rainier", "bullnose-standard", "Standard Bullnose Blocks", 24.98, 1],
    ["rainier", "aluminium-edge", "Aluminium Edge Restraint", 5.00, 2],
    ["rainier", "no-edge-rainier", "No Edge Finishing", 0.00, 3],
    ["appalachian", "standard-edge-board", "Standard Edge Boards", 10.99, 1],
    ["appalachian", "corner-edge-board", "Corner Edge Boards", 18.74, 2],
    ["appalachian", "no-edge-app", "No Edge Finishing", 0.00, 3],
  ];

  for (const [colSlug, slug, name, price, order] of edges) {
    await db.execute(sql`INSERT INTO edge_options (collectionSlug, slug, name, pricePerLinearFt, sortOrder, isActive) VALUES (${colSlug}, ${slug}, ${name}, ${price}, ${order}, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  }
  console.log("  ✓ Edge options");

  // Accessories
  const accs = [
    ["grooved-clips", "Grooved Clips & Fasteners", "sqft", 0.74, "Required clips for grooved board installation", null, 0, 1],
    ["starter-clip", "Starter Clip & Fastener", "sqft", 0.80, "Starting clips for first board row", null, 0, 2],
    ["edge-clip", "Edge Clip & Fastener", "sqft", 0.80, "Clips for edge board finishing", null, 0, 3],
    ["joist-tape", "Joist Tape", "sqft", 0.44, "Protective tape for joist surfaces", null, 0, 4],
    ["epdm-membrane", "EPDM Membrane", "sqft", 1.50, "Waterproofing membrane (Rainier only)", '["rainier"]', 0, 5],
    ["diamond-blade", "Diamond Blade", "each", 35.00, "For cutting stone tiles to size", null, 1, 6],
    ["sanding-pad", "Stone Sanding Pad", "each", 15.00, "For smoothing cut edges", null, 1, 7],
  ];

  for (const [slug, name, unit, price, desc, reqFor, isOpt, order] of accs) {
    await db.execute(sql`INSERT INTO accessories (slug, name, unit, pricePerUnit, description, requiredForCollections, isOptional, isActive, sortOrder) VALUES (${slug}, ${name}, ${unit}, ${price}, ${desc}, ${reqFor}, ${isOpt}, 1, ${order}) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  }
  console.log("  ✓ Accessories");

  // Labor tiers
  const labor = [
    ["materials-only", "Materials Only", "DIY — materials and accessories only, no installation labor", 0.00, 1],
    ["basic", "Basic Installation", "Standard deck surface installation on existing frame", 8.00, 2],
    ["standard", "Standard Installation", "Surface installation with edge finishing and minor prep work", 12.00, 3],
    ["premium", "Premium Installation", "Full installation including framing, substrate prep, and finishing", 18.00, 4],
    ["complex", "Complex / Multi-Level", "Multi-level decks, stairs, custom patterns, and full build-out", 25.00, 5],
  ];

  for (const [slug, name, desc, price, order] of labor) {
    await db.execute(sql`INSERT INTO labor_tiers (slug, name, description, pricePerSqft, sortOrder, isActive) VALUES (${slug}, ${name}, ${desc}, ${price}, ${order}, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  }
  console.log("  ✓ Labor tiers");

  // Delivery options
  const delivery = [
    ["pickup", "Customer Pickup", "Pick up from our Orem, UT location", 0.00, 1],
    ["local", "Local Delivery (Utah County)", "Delivery within Utah County", 150.00, 2],
    ["wasatch", "Wasatch Front Delivery", "Salt Lake, Davis, Weber counties", 250.00, 3],
    ["statewide", "Statewide Delivery", "Anywhere in Utah", 450.00, 4],
  ];

  for (const [slug, name, desc, price, order] of delivery) {
    await db.execute(sql`INSERT INTO delivery_options (slug, name, description, price, sortOrder, isActive) VALUES (${slug}, ${name}, ${desc}, ${price}, ${order}, 1) ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  }
  console.log("  ✓ Delivery options");

  // Site settings
  const settings = [
    ["tax_rate", "0.0745", "Sales Tax Rate", "Utah sales tax rate (Orem)", "pricing"],
    ["waste_factor_default", "10", "Default Waste Factor (%)", "Default waste percentage for material estimates", "pricing"],
    ["stair_tread_price", "14.00", "Stair Tread Price (per sqft)", "Price per square foot for stair treads", "pricing"],
    ["stair_riser_price", "12.00", "Stair Riser Price (per linear ft)", "Price per linear foot for stair risers", "pricing"],
    ["permit_cost", "250", "Permit Assistance Cost", "Cost for building permit assistance", "pricing"],
    ["company_name", "Design Your Price", "Company Name", "Business name displayed on the site", "company"],
    ["company_location", "Orem, Utah", "Company Location", "Business location", "company"],
    ["company_tagline", "Tanzite Stone Decking Specialists", "Company Tagline", "Subtitle shown under company name", "company"],
    ["company_phone", "Contact Us for a Quote", "Phone / CTA Text", "Phone number or call-to-action text", "company"],
    ["hero_title", "Tanzite Stone Decking", "Hero Title", "Main heading on the hero section", "hero"],
    ["hero_subtitle", "Cost Calculator", "Hero Subtitle", "Accent text below the hero title", "hero"],
    ["hero_description", "Get an instant estimate for your Tanzite Rainier or Appalachian stone decking project. Customize materials, colors, dimensions, and installation options to design your perfect outdoor space.", "Hero Description", "Paragraph text in the hero section", "hero"],
    ["hero_badges", "Rainier & Appalachian,8+ Stone Colors,Instant Pricing,Utah Installation", "Hero Badges", "Comma-separated badge labels shown in the hero", "hero"],
    ["estimate_disclaimer", "* This estimate is for informational purposes only and does not constitute a binding quote. Final pricing may vary based on site conditions, material availability, and project complexity. Sales tax applied to materials only. Contact Design Your Price for a detailed proposal.", "Estimate Disclaimer", "Legal disclaimer shown below the cost summary", "verbiage"],
    ["footer_text", "Professional Tanzite stone decking installation serving the Wasatch Front and all of Utah. Licensed and insured.", "Footer Text", "Main text in the footer section", "verbiage"],
    ["step1_title", "Choose Your Collection", "Step 1 Title", "Section heading for collection selection", "verbiage"],
    ["step2_title", "Select Stone Color", "Step 2 Title", "Section heading for color selection", "verbiage"],
    ["step3_title", "Project Dimensions", "Step 3 Title", "Section heading for dimensions input", "verbiage"],
    ["step4_title", "Edge Finishing", "Step 4 Title", "Section heading for edge options", "verbiage"],
    ["step5_title", "Stairs", "Step 5 Title", "Section heading for stairs section", "verbiage"],
    ["step6_title", "Installation Service", "Step 6 Title", "Section heading for labor selection", "verbiage"],
    ["step7_title", "Delivery", "Step 7 Title", "Section heading for delivery options", "verbiage"],
    ["sign_reminder_after_days", "3", "Reminder After (days)", "Days after sending a signing link before a reminder email is sent", "reminders"],
    ["sign_reminder_max_count", "2", "Max Reminders Per Request", "Maximum number of reminder emails to send per unsigned contract", "reminders"],
  ];

  for (const [key, value, label, desc, cat] of settings) {
    await db.execute(sql`INSERT INTO site_settings (settingKey, settingValue, label, description, category) VALUES (${key}, ${value}, ${label}, ${desc}, ${cat}) ON DUPLICATE KEY UPDATE settingValue=settingValue`);
  }
  console.log("  ✓ Site settings");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
