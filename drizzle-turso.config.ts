import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL || "file:./dev.db";
const authToken = process.env.TURSO_DATABASE_AUTH_TOKEN || "dummy-token";

if (!url) {
  console.error("TURSO_DATABASE_URL environment variable must be set.");
  throw new Error(
    "Missing environment variables for Turso database configuration.",
  );
}

export default defineConfig({
  out: "./src/core/adapters/drizzleTurso/migrations",
  schema: "./src/core/adapters/drizzleTurso/schema.ts",
  dialect: "turso",
  dbCredentials: url.startsWith("file:") ? { url } : { url, authToken },
});
