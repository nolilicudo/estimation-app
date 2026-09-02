import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Seed rain_escape_options
const [existingRain] = await conn.execute('SELECT COUNT(*) as cnt FROM rain_escape_options');
if (existingRain[0].cnt === 0) {
  await conn.execute(`
    INSERT INTO rain_escape_options (slug, name, description, gutter_price_per_linear_ft, system_price_per_sqft, labor_price_per_sqft, sort_order, is_active)
    VALUES 
    ('standard', 'Trex RainEscape Standard', 'Complete under-deck drainage system with concealed gutter channels. Keeps the area below your deck dry and usable year-round.', '12.50', '4.75', '2.25', 1, 1)
  `);
  console.log('Seeded rain_escape_options');
} else {
  console.log('rain_escape_options already has data, skipping seed');
}

// Seed soffit_materials
const [existingSoffit] = await conn.execute('SELECT COUNT(*) as cnt FROM soffit_materials');
if (existingSoffit[0].cnt === 0) {
  await conn.execute(`
    INSERT INTO soffit_materials (slug, name, description, price_per_sqft, labor_price_per_sqft, sort_order, is_active)
    VALUES 
    ('tongue-groove-wood', 'Tongue & Groove Wood', 'Natural cedar or pine T&G boards for a warm, classic look. Requires periodic sealing/staining.', '6.50', '3.50', 1, 1),
    ('tongue-groove-pvc', 'Tongue & Groove PVC', 'Low-maintenance PVC T&G panels that mimic wood grain. Moisture-resistant and paintable.', '7.25', '3.25', 2, 1),
    ('standard-aluminum', 'Standard Aluminum Soffit', 'Vented aluminum soffit panels in white or custom color. Durable, low-maintenance, and cost-effective.', '3.75', '2.50', 3, 1),
    ('painted-cement-board', 'Painted Cement Board', 'Fiber cement soffit panels with a factory-primed finish. Excellent moisture and impact resistance.', '5.25', '4.00', 4, 1)
  `);
  console.log('Seeded soffit_materials');
} else {
  console.log('soffit_materials already has data, skipping seed');
}

await conn.end();
console.log('Done');
