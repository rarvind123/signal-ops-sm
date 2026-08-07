import { NextResponse } from "next/server";
import { BASE_PATH } from "@/lib/base-path";

const COOKIE_NAME = "sm_site_auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    path: BASE_PATH || "/",
    maxAge: 0,
  });
  return response;
}
