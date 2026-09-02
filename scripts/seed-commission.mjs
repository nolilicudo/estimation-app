import { drizzle } from "drizzle-orm/mysql2";
import { eq, asc } from "drizzle-orm";
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Inline the table definition to avoid TS compilation
const { mysqlTable, int, varchar, decimal, timestamp } = await import("drizzle-orm/mysql-core");

const designPackageCommission = mysqlTable("design_package_commission", {
  id: int("id").autoincrement().primaryKey(),
  projectType: varchar("projectType", { length: 64 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const defaults = [
  { projectType: "bathroom", label: "Bathroom / Small Kitchen Remodel", commissionAmount: "750.00" },
  { projectType: "kitchen", label: "Kitchen Remodel", commissionAmount: "750.00" },
  { projectType: "full_home_remodel", label: "Full Home Remodel", commissionAmount: "1000.00" },
  { projectType: "addition", label: "Addition", commissionAmount: "2000.00" },
];

for (const row of defaults) {
  const existing = await db.select().from(designPackageCommission)
    .where(eq(designPackageCommission.projectType, row.projectType));
  if (existing.length === 0) {
    await db.insert(designPackageCommission).values(row);
    console.log(`Inserted commission for ${row.projectType}: $${row.commissionAmount}`);
  } else {
    console.log(`Already exists: ${row.projectType}`);
  }
}

await conn.end();
console.log("Done.");
