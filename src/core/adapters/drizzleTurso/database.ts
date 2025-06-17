import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_DATABASE_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL environment variable is not set");
}

const client = createClient({
  url,
  authToken: url.startsWith("file:") ? undefined : authToken,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
