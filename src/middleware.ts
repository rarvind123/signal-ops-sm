import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SITE_PASSWORD = "arvind123";
const COOKIE_NAME = "sm_site_auth";
const LOGIN_PATH = "/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === LOGIN_PATH ||
    pathname.startsWith("/review/") ||
    pathname.startsWith("/api/sm/review/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/inventious-logo")
  ) {
    return NextResponse.next();
  }

  const auth = request.cookies.get(COOKIE_NAME);
  if (auth?.value === SITE_PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
