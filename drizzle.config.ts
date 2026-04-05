import 'dotenv/config';
import { defineConfig } from "drizzle-kit";

console.log("ENV VALUE:", process.env.DATABASE_URL); // 👈 ADD THIS

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});