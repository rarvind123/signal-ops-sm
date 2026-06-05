import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getCreativeRequestBundle } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const bundle = await getCreativeRequestBundle(id);
    if (!bundle) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return bundle;
  });
}
