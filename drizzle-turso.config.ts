import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set.");
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
