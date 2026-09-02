import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("Seeding demo & rebuild options...");

  // 1. Demolition Options
  await db.execute(sql`INSERT INTO demolition_options (slug, name, description, pricePerSqft, sortOrder) VALUES
    ('basic-demo', 'Basic Deck Removal', 'Single-level wood or composite deck teardown including haul-away and disposal', '5.00', 0),
    ('complex-demo', 'Complex Deck Removal', 'Multi-level deck, heavy materials (stone/concrete), or difficult access. Includes haul-away and disposal', '8.00', 1),
    ('demo-with-concrete', 'Deck + Concrete Removal', 'Full deck teardown plus removal of existing concrete pads, footings, or slabs', '11.00', 2)
  `);
  console.log("  ✓ Demolition options seeded");

  // 2. Footing Options
  await db.execute(sql`INSERT INTO footing_options (slug, name, description, pricePerUnit, unit, sortOrder) VALUES
    ('sonotube-12', 'Standard Sonotube (12")', '12-inch diameter sonotube footing, 36" deep below frost line. Includes dig, form, rebar, and pour', '200.00', 'each', 0),
    ('sonotube-16', 'Large Sonotube (16")', '16-inch diameter sonotube footing, 42" deep. For heavier loads or taller decks', '300.00', 'each', 1),
    ('helical-pier', 'Helical Pier', 'Steel helical pier driven to load-bearing soil. No concrete needed, minimal disturbance', '400.00', 'each', 2),
    ('concrete-pier-block', 'Precast Pier Block', 'Pre-formed concrete pier block set on compacted gravel base. For ground-level decks only', '75.00', 'each', 3)
  `);
  console.log("  ✓ Footing options seeded");

  // 3. Concrete Options
  await db.execute(sql`INSERT INTO concrete_options (slug, name, description, pricePerUnit, unit, sortOrder) VALUES
    ('concrete-pad', 'Concrete Pad / Landing', 'Poured concrete pad or landing area at deck base. 4" thick with wire mesh reinforcement', '10.00', 'sqft', 0),
    ('concrete-steps', 'Concrete Steps', 'Formed and poured concrete steps with broom finish. Price per step', '400.00', 'each', 1),
    ('concrete-walkway', 'Concrete Walkway', 'Poured concrete walkway connecting deck to patio or driveway. 4" thick', '12.00', 'sqft', 2),
    ('stamped-concrete', 'Stamped Concrete Pad', 'Decorative stamped concrete pad with color and pattern. Premium finish', '18.00', 'sqft', 3)
  `);
  console.log("  ✓ Concrete options seeded");

  // 4. Framing Options
  await db.execute(sql`INSERT INTO framing_options (slug, name, description, pricePerSqft, sortOrder) VALUES
    ('pt-lumber-standard', 'Pressure-Treated Lumber (Standard)', 'Standard pressure-treated lumber framing. Includes joists (16" OC), beams, ledger board, posts, and all hardware', '18.00', 0),
    ('pt-lumber-premium', 'Pressure-Treated Lumber (Premium)', 'Premium PT lumber with closer joist spacing (12" OC), upgraded hardware, and double beams for longer spans', '24.00', 1),
    ('steel-framing', 'Steel Framing', 'Galvanized steel deck framing system. Superior strength, no rot or warping, longer lifespan', '32.00', 2)
  `);
  console.log("  ✓ Framing options seeded");

  // 5. Facade Options
  await db.execute(sql`INSERT INTO facade_options (slug, name, description, pricePerSqft, sortOrder) VALUES
    ('stucco', 'Stucco', 'Three-coat stucco system applied over lath. Includes scratch, brown, and finish coats with color matching', '10.00', 0),
    ('vinyl-siding', 'Vinyl Siding', 'Vinyl siding panels with insulation backing. Includes J-channel, corner trim, and color-matched accessories', '7.00', 1),
    ('hardie-board', 'Hardie Board (Fiber Cement)', 'James Hardie fiber cement lap siding. Primed and painted, includes trim and flashing', '12.00', 2),
    ('brick-veneer', 'Brick Veneer', 'Thin brick veneer adhered to wall surface. Includes mortar, grout, and sealer', '22.00', 3),
    ('stone-veneer', 'Stone Veneer', 'Manufactured or natural stone veneer. Includes mortar bed, stone installation, and grout/sealer', '28.00', 4),
    ('none', 'No Facade Work Needed', 'Skip exterior facade repair — not applicable to this project', '0.00', 5)
  `);
  console.log("  ✓ Facade options seeded");

  console.log("\n✅ All demo & rebuild options seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
