import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  strict: true,
  verbose: true,
  dbCredentials: {
    // Only needed by commands that connect (migrate, studio); `generate` works offline.
    url: process.env.DATABASE_URL ?? "",
  },
});
