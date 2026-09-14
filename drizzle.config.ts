import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Strip `ssl-mode` param which drizzle-kit / mysql2 don't support natively
const cleanUrl = connectionString.replace(/[?&]ssl-mode=[^&]*/i, "");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: cleanUrl,
    ssl: {},
  },
});
