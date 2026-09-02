import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

// Load env
try {
  const env = readFileSync("/home/ubuntu/tanzite-calculator/.env", "utf8");
  env.split("\n").forEach((line) => {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  });
} catch {}

const conn = await createConnection(process.env.DATABASE_URL);

// Get max sortOrder
const [[{ maxSort }]] = await conn.execute(
  "SELECT MAX(sortOrder) as maxSort FROM railing_options"
);
const nextSort = (maxSort || 0) + 1;

// Insert Wood Railing
const [woodResult] = await conn.execute(
  `INSERT INTO railing_options 
    (name, railingType, orientation, description, pricePerLf, costPerLf, installCostPerLf, marginPct, colorVariant, sortOrder, isActive)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    "Wood Railing",
    "wood",
    null,
    "Natural wood railing — classic look for traditional and rustic deck designs.",
    "80.00",
    "35.00",
    "0.00",
    "0.00",
    null,
    nextSort,
    1,
  ]
);
console.log("Inserted Wood Railing, id:", woodResult.insertId);

// Insert Glass Railing
const [glassResult] = await conn.execute(
  `INSERT INTO railing_options 
    (name, railingType, orientation, description, pricePerLf, costPerLf, installCostPerLf, marginPct, colorVariant, sortOrder, isActive)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    "Glass Railing",
    "glass",
    null,
    "Frameless glass railing — sleek, modern look with unobstructed views.",
    "200.00",
    "90.00",
    "0.00",
    "0.00",
    null,
    nextSort + 1,
    1,
  ]
);
console.log("Inserted Glass Railing, id:", glassResult.insertId);

// Verify
const [rows] = await conn.execute(
  "SELECT id, name, railingType, pricePerLf, costPerLf FROM railing_options WHERE railingType IN ('wood','glass')"
);
console.log("New records:", JSON.stringify(rows, null, 2));

await conn.end();
