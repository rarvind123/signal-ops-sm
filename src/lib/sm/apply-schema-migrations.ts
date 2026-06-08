import "server-only";

import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const { Client } = pg;

export async function applySchemaMigrations(databaseUrl: string): Promise<string[]> {
  const sqlPath = join(process.cwd(), "supabase", "run-in-sql-editor.sql");
  const sql = readFileSync(sqlPath, "utf8");

  const statements = sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 0 && !s.startsWith("="));

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const applied: string[] = [];

  try {
    for (const statement of statements) {
      await client.query(statement);
      applied.push(statement.slice(0, 80).replace(/\s+/g, " "));
    }
  } finally {
    await client.end();
  }

  return applied;
}

export function isReviewColumnError(message: string): boolean {
  return (
    message.includes("review_enabled") ||
    message.includes("review_token") ||
    message.includes("schema cache")
  );
}

export const SCHEMA_MIGRATION_HINT =
  "Database schema is out of date. In Supabase Dashboard → SQL Editor, run the file supabase/run-in-sql-editor.sql — or set DATABASE_URL and POST /api/admin/migrate-schema with header x-admin-key: Mumbai.";
