import "server-only";

import { NextResponse } from "next/server";

export async function smRouteHandler<T>(
  _req: Request,
  handler: () => Promise<T | Response>
): Promise<Response> {
  try {
    const result = await handler();
    if (result instanceof Response) return result;
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("[SM API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
