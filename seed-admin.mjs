import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const db = drizzle(process.env.DATABASE_URL);

const email = "tanner@designyourprice.com";
const password = "Design123";
const name = "Tanner";

const passwordHash = await bcrypt.hash(password, 12);

console.log("Seeding admin user...");
await db.execute(sql`INSERT INTO admin_users (email, passwordHash, name, isActive) VALUES (${email}, ${passwordHash}, ${name}, 1)
  ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), name = VALUES(name)`);

console.log(`Admin user created: ${email}`);
process.exit(0);
