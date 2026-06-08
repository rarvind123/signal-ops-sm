import { NextResponse } from "next/server";
import { applySchemaMigrations } from "@/lib/sm/apply-schema-migrations";

export const runtime = "nodejs";

const ADMIN_KEY = "Mumbai";

export async function POST(req: Request) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL is not configured. Add your Supabase Postgres connection string to Vercel env vars (Project Settings → Database → URI), or run supabase/run-in-sql-editor.sql manually in the SQL Editor.",
      },
      { status: 400 }
    );
  }

  try {
    const applied = await applySchemaMigrations(databaseUrl);
    return NextResponse.json({
      ok: true,
      message: "Schema migrations applied. Wait 30s for Supabase API cache to refresh.",
      statements_run: applied.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
