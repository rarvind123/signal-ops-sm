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

function publicSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

function serverSupabaseKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

// Server-side client (full access)
export function getSupabase(): SupabaseClient {
  if (!serverClient) {
    const serviceKey = serverSupabaseKey();
    if (!serviceKey) {
      throw new Error(
        "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local."
      );
    }
    serverClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), serviceKey);
  }
  return serverClient;
}

// Client-side client (anon access)
export function getSupabasePublic(): SupabaseClient {
  if (!publicClient) {
    const publicKey = publicSupabaseKey();
    if (!publicKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set."
      );
    }
    publicClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), publicKey);
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
