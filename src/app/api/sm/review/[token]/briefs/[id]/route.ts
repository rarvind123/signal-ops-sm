import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getCampaignReviewByToken,
  getCreativeBrief,
  patchCreativeBriefFields,
} from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string; id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { token, id } = await context.params;
    const review = await getCampaignReviewByToken(token);
    if (!review) {
      return NextResponse.json({ error: "Review link not found or disabled" }, { status: 404 });
    }

    const brief = await getCreativeBrief(id);
    if (!brief || brief.campaign_id !== review.campaign.id) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const body = (await req.json()) as { approved?: boolean; client_comment?: string };
    const patch: Parameters<typeof patchCreativeBriefFields>[1] = {};
    if (body.approved !== undefined) patch.approved = Boolean(body.approved);
    if (body.client_comment !== undefined) patch.client_comment = String(body.client_comment);

    await patchCreativeBriefFields(id, patch);
    return { ok: true };
  });
}
