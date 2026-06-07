import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { enableCampaignReview } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id } = await context.params;
    const campaign = await enableCampaignReview(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return { campaign, review_url: `/review/${campaign.review_token}` };
  });
}
