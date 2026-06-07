import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getCampaignReviewByToken } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { token } = await context.params;
    const data = await getCampaignReviewByToken(token);
    if (!data) {
      return NextResponse.json({ error: "Review link not found or disabled" }, { status: 404 });
    }
    return data;
  });
}
