import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const rawUrl = (process.env.DATABASE_URL || "").replace(/[?&]ssl-mode=[^&]*/i, "");
const conn = await mysql.createConnection({ uri: rawUrl, ssl: { rejectUnauthorized: false } });

const email = "tanner@designyourprice.com";
const password = "Design123";
const name = "Tanner";

const passwordHash = await bcrypt.hash(password, 12);

console.log("Seeding admin user...");
await conn.execute(
  `INSERT INTO admin_users (email, passwordHash, name, isActive) VALUES (?, ?, ?, 1)
   ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), name = VALUES(name)`,
  [email, passwordHash, name]
);

console.log(`Admin user created: ${email}`);
await conn.end();
process.exit(0);

