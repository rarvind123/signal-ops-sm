import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { BASE_PATH, withBasePath } from "@/lib/base-path";

const SITE_PASSWORD = "arvind123";
const COOKIE_NAME = "sm_site_auth";
const LOGIN_PATH = withBasePath("/login");

const CANONICAL_HOST = "inventious.co";
const INVENTIOUS_HOSTS = new Set([
  "inventious.co",
  "www.inventious.co",
  "inventious.com",
  "www.inventious.com",
]);
const VERCEL_HOSTS = new Set([
  "signal-ops-sm.vercel.app",
  "www.signal-ops-sm.vercel.app",
]);

function stripBasePath(pathname: string): string {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (VERCEL_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    url.pathname = withBasePath(stripBasePath(url.pathname));
    return NextResponse.redirect(url, 308);
  }

  const { response: supabaseResponse } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const appPath = stripBasePath(pathname);

  if (
    appPath === "/login" ||
    appPath.startsWith("/review/") ||
    appPath.startsWith("/api/sm/review/") ||
    appPath.startsWith("/api/") ||
    appPath.startsWith("/_next/") ||
    appPath.startsWith("/favicon") ||
    appPath.startsWith("/inventious-logo")
  ) {
    return supabaseResponse;
  }

  const auth = request.cookies.get(COOKIE_NAME);
  if (auth?.value === SITE_PASSWORD) {
    return supabaseResponse;
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
