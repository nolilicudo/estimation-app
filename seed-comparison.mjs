import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const rawUrl = (process.env.DATABASE_URL || '').replace(/[?&]ssl-mode=[^&]*/i, '');
const conn = await mysql.createConnection({ uri: rawUrl, ssl: { rejectUnauthorized: false } });

const materials = [
  { slug: 'pressure-treated-wood', name: 'Pressure-Treated Wood', description: 'Traditional pressure-treated lumber decking. Lowest upfront cost but requires regular staining/sealing every 1-3 years.', materialCostPerSqft: '8.00', laborCostPerSqft: '12.00', annualMaintenanceCostPerSqft: '2.50', lifespanYears: 12, warrantyYears: 0, colorHex: '#A0785A', pros: JSON.stringify(['Lowest upfront cost', 'Easy to cut and customize', 'Widely available', 'DIY-friendly installation']), cons: JSON.stringify(['Requires staining/sealing every 1-3 years', 'Prone to warping, cracking, and splinters', 'Shorter lifespan (10-15 years)', 'Can rot and attract insects']), sortOrder: 1, isActive: 1 },
  { slug: 'composite-decking', name: 'Composite Decking', description: 'Engineered wood-plastic composite boards (e.g., Trex, TimberTech). Mid-range pricing with low maintenance.', materialCostPerSqft: '15.00', laborCostPerSqft: '12.00', annualMaintenanceCostPerSqft: '0.50', lifespanYears: 25, warrantyYears: 25, colorHex: '#7B6B5D', pros: JSON.stringify(['Low maintenance', '25-30 year lifespan', 'Consistent appearance', 'Many color options']), cons: JSON.stringify(['Gets hot in direct sunlight', 'Susceptible to scratching', 'Higher upfront cost than wood', 'Can look artificial']), sortOrder: 2, isActive: 1 },
  { slug: 'resin-stone', name: 'Resin Stone', description: 'Resin-bound stone aggregate surface. Attractive natural stone appearance with moderate durability.', materialCostPerSqft: '14.00', laborCostPerSqft: '14.00', annualMaintenanceCostPerSqft: '1.00', lifespanYears: 20, warrantyYears: 10, colorHex: '#B8A99A', pros: JSON.stringify(['Natural stone appearance', 'Permeable surface', 'Seamless finish', 'UV stable colors']), cons: JSON.stringify(['Requires resealing every 5-8 years', 'Can crack if base shifts', 'Limited to flat surfaces', 'Not as durable as solid stone']), sortOrder: 3, isActive: 1 },
];

console.log('Seeding comparison materials...');
for (const mat of materials) {
  await conn.execute(
    'INSERT INTO comparison_materials (slug, name, description, materialCostPerSqft, laborCostPerSqft, annualMaintenanceCostPerSqft, lifespanYears, warrantyYears, colorHex, pros, cons, sortOrder, isActive) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), materialCostPerSqft=VALUES(materialCostPerSqft), laborCostPerSqft=VALUES(laborCostPerSqft), sortOrder=VALUES(sortOrder)',
    [mat.slug, mat.name, mat.description, mat.materialCostPerSqft, mat.laborCostPerSqft, mat.annualMaintenanceCostPerSqft, mat.lifespanYears, mat.warrantyYears, mat.colorHex, mat.pros, mat.cons, mat.sortOrder, mat.isActive]
  );
  console.log('  v ' + mat.name);
}
console.log('Done!');
await conn.end();
