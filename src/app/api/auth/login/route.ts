import { NextResponse } from "next/server";
import { BASE_PATH, withBasePath } from "@/lib/base-path";

const SITE_PASSWORD = "arvind123";
const COOKIE_NAME = "sm_site_auth";

export async function POST(req: Request) {
  const body = (await req.json()) as { password?: string };

  if (body.password !== SITE_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(COOKIE_NAME, SITE_PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: BASE_PATH || "/",
  });

  return response;
}
