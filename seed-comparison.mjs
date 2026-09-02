import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const materials = [
  {
    slug: "pressure-treated-wood",
    name: "Pressure-Treated Wood",
    description: "Traditional pressure-treated lumber decking. Lowest upfront cost but requires regular staining/sealing every 1-3 years. Susceptible to warping, splitting, and rot over time.",
    materialCostPerSqft: "8.00",
    laborCostPerSqft: "12.00",
    annualMaintenanceCostPerSqft: "2.50",
    lifespanYears: 12,
    warrantyYears: 0,
    colorHex: "#A0785A",
    pros: JSON.stringify(["Lowest upfront cost", "Easy to cut and customize", "Widely available", "DIY-friendly installation"]),
    cons: JSON.stringify(["Requires staining/sealing every 1-3 years", "Prone to warping, cracking, and splinters", "Shorter lifespan (10-15 years)", "Can rot and attract insects"]),
    sortOrder: 1,
    isActive: 1,
  },
  {
    slug: "composite-decking",
    name: "Composite Decking",
    description: "Engineered wood-plastic composite boards (e.g., Trex, TimberTech). Mid-range pricing with low maintenance. Available in many colors but can get hot in direct sun and may scratch.",
    materialCostPerSqft: "15.00",
    laborCostPerSqft: "12.00",
    annualMaintenanceCostPerSqft: "0.50",
    lifespanYears: 25,
    warrantyYears: 25,
    colorHex: "#7B6B5D",
    pros: JSON.stringify(["Low maintenance — no staining needed", "25-30 year lifespan", "Consistent appearance", "Many color options"]),
    cons: JSON.stringify(["Gets hot in direct sunlight", "Susceptible to scratching", "Higher upfront cost than wood", "Can look artificial"]),
    sortOrder: 2,
    isActive: 1,
  },
  {
    slug: "resin-stone",
    name: "Resin Stone",
    description: "Resin-bound stone aggregate surface applied over a prepared base. Attractive natural stone appearance with moderate durability. Requires periodic resealing.",
    materialCostPerSqft: "14.00",
    laborCostPerSqft: "14.00",
    annualMaintenanceCostPerSqft: "1.00",
    lifespanYears: 20,
    warrantyYears: 10,
    colorHex: "#B8A99A",
    pros: JSON.stringify(["Natural stone appearance", "Permeable surface — good drainage", "Seamless finish", "UV stable colors"]),
    cons: JSON.stringify(["Requires resealing every 5-8 years", "Can crack if base shifts", "Limited to flat surfaces", "Not as durable as solid stone"]),
    sortOrder: 3,
    isActive: 1,
  },
];

async function seed() {
  console.log("Seeding comparison materials...");

  for (const mat of materials) {
    await db.execute(sql`
      INSERT INTO comparison_materials (slug, name, description, materialCostPerSqft, laborCostPerSqft, annualMaintenanceCostPerSqft, lifespanYears, warrantyYears, colorHex, pros, cons, sortOrder, isActive)
      VALUES (${mat.slug}, ${mat.name}, ${mat.description}, ${mat.materialCostPerSqft}, ${mat.laborCostPerSqft}, ${mat.annualMaintenanceCostPerSqft}, ${mat.lifespanYears}, ${mat.warrantyYears}, ${mat.colorHex}, ${mat.pros}, ${mat.cons}, ${mat.sortOrder}, ${mat.isActive})
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        materialCostPerSqft = VALUES(materialCostPerSqft),
        laborCostPerSqft = VALUES(laborCostPerSqft),
        annualMaintenanceCostPerSqft = VALUES(annualMaintenanceCostPerSqft),
        lifespanYears = VALUES(lifespanYears),
        warrantyYears = VALUES(warrantyYears),
        colorHex = VALUES(colorHex),
        pros = VALUES(pros),
        cons = VALUES(cons),
        sortOrder = VALUES(sortOrder),
        isActive = VALUES(isActive)
    `);
    console.log(`  ✓ ${mat.name}`);
  }

  console.log("Done seeding comparison materials!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
