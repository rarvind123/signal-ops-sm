import "server-only";

import { NextResponse } from "next/server";

function humanizeApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Internal server error";
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : error instanceof Error && error.cause
        ? String(error.cause)
        : "";
  const combined = `${message} ${cause}`.toLowerCase();

  if (
    combined.includes("fetch failed") ||
    combined.includes("enotfound") ||
    combined.includes("nxdomain") ||
    combined.includes("getaddrinfo") ||
    combined.includes("econnrefused") ||
    combined.includes("econnreset") ||
    combined.includes("und_err_connect_timeout") ||
    combined.includes("network")
  ) {
    return (
      "Cannot reach the database (Supabase). Check NEXT_PUBLIC_SUPABASE_URL — " +
      "the project may be paused, deleted, or the URL may be wrong. " +
      "Update .env.local (and Vercel env), then restart the app."
    );
  }

  if (combined.includes("supabase") && combined.includes("not set")) {
    return message;
  }

  if (
    combined.includes("invalid api key") ||
    combined.includes("invalid jwt") ||
    combined.includes("jwt expired")
  ) {
    return (
      "Supabase rejected the API key. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY " +
      "must both belong to the same project. Copy the secret/service_role key from " +
      "Supabase → Project Settings → API into .env.local, then restart the app."
    );
  }

  return message;
}

export async function smRouteHandler<T>(
  _req: Request,
  handler: () => Promise<T | Response>
): Promise<Response> {
  try {
    const result = await handler();
    if (result instanceof Response) return result;
    return NextResponse.json(result);
  } catch (e) {
    const message = humanizeApiError(e);
    console.error("[SM API]", e instanceof Error ? e.message : message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
