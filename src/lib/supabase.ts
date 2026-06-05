import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local.`);
  }
  return value;
}

// Server-side client (full access)
export function getSupabase(): SupabaseClient {
  if (!serverClient) {
    serverClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    );
  }
  return serverClient;
}

// Client-side client (anon access)
export function getSupabasePublic(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }
  return publicClient;
}

// Lazy proxy so importing modules does not crash at build time.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const supabasePublic = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabasePublic();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
