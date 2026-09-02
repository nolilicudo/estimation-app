import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { config } from "dotenv";
config();

import { drizzle } from "drizzle-orm/mysql2";
import { designPackageItems } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const items = [
  // Sqft-based items (addition + full home remodel)
  { name: "Architectural Engineering", description: "Full architectural drawings and plans", pricingType: "sqft", costPerSqft: "2.2500", flatCost: "0.00", markupPct: "50.00", projectTypes: "addition,full_home_remodel", sortOrder: 1 },
  { name: "Structural Engineering", description: "Structural calculations and stamped drawings", pricingType: "sqft", costPerSqft: "1.5000", flatCost: "0.00", markupPct: "50.00", projectTypes: "addition,full_home_remodel", sortOrder: 2 },
  // Flat fee items (all project types)
  { name: "Material Selections", description: "Curated material selection package", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "all", sortOrder: 10 },
  { name: "Cabinet Drawings / Built-ins", description: "Custom cabinet and built-in drawings", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "all", sortOrder: 11 },
  { name: "Manual J", description: "HVAC load calculation (Manual J)", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "addition,full_home_remodel", sortOrder: 12 },
  { name: "REScheck", description: "Energy compliance report (REScheck)", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "addition,full_home_remodel", sortOrder: 13 },
  { name: "Gas Schematic & Sizing", description: "Gas line schematic and sizing calculations", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "all", sortOrder: 14 },
  { name: "Electrical Schematic", description: "Electrical layout and schematic drawings", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "all", sortOrder: 15 },
  { name: "Plumbing Schematic", description: "Plumbing layout and schematic drawings", pricingType: "flat", costPerSqft: "0.0000", flatCost: "0.00", markupPct: "50.00", projectTypes: "all", sortOrder: 16 },
  // Rendering items
  { name: "3D Rendering — Small Bathroom / Area", description: "3D rendering of a small bathroom or focused area", pricingType: "rendering", costPerSqft: "0.0000", flatCost: "500.00", markupPct: "50.00", projectTypes: "all", renderingType: "small_bathroom", sortOrder: 20 },
  { name: "3D Rendering — Large Bathroom / Area", description: "3D rendering of a large bathroom or area", pricingType: "rendering", costPerSqft: "0.0000", flatCost: "1000.00", markupPct: "50.00", projectTypes: "all", renderingType: "large_bathroom", sortOrder: 21 },
  { name: "3D Rendering — Kitchen", description: "3D rendering of kitchen design", pricingType: "rendering", costPerSqft: "0.0000", flatCost: "1500.00", markupPct: "50.00", projectTypes: "all", renderingType: "kitchen", sortOrder: 22 },
  { name: "3D Rendering — Exterior", description: "3D rendering of exterior design", pricingType: "rendering", costPerSqft: "0.0000", flatCost: "850.00", markupPct: "50.00", projectTypes: "all", renderingType: "exterior", sortOrder: 23 },
];

try {
  await db.insert(designPackageItems).values(items);
  console.log(`Inserted ${items.length} design package items.`);
} catch (e) {
  console.error("Error:", e.message);
}
process.exit(0);
