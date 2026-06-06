import { NextResponse } from "next/server";
import { generateCreativeBrief } from "@/lib/sm/creative-brief-engine";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getCalendarItems,
  getCampaign,
  getCampaignBriefs,
  getCampaignStrategy,
  getClient,
  saveCreativeBrief,
  updateCalendarItemStatus,
  updateCampaign,
} from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    return getCampaignBriefs(id);
  });
}

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [client, strategy, calendarItems] = await Promise.all([
      getClient(campaign.client_id),
      getCampaignStrategy(id),
      getCalendarItems(id),
    ]);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 400 });
    }
    if (calendarItems.length === 0) {
      return NextResponse.json({ error: "Calendar empty — generate calendar first" }, { status: 400 });
    }

    const briefs = [];
    for (const item of calendarItems) {
      const briefData = await generateCreativeBrief(client, campaign, strategy, item);
      const saved = await saveCreativeBrief({
        calendar_item_id: item.id,
        campaign_id: id,
        post_number: briefData.post_number,
        format: briefData.format,
        pillar: briefData.pillar,
        objective: briefData.objective,
        hook: briefData.hook,
        structure: briefData.structure ?? [],
        creative_direction: briefData.creative_direction,
        caption_direction: briefData.caption_direction,
        cta: briefData.cta,
        hashtag_suggestions: briefData.hashtag_suggestions ?? [],
        visual_approach_mode: briefData.visual_approach_mode,
        scene_description: briefData.scene_description,
        status: "pending",
      });
      await updateCalendarItemStatus(item.id, "brief_ready");
      briefs.push(saved);
    }

    await updateCampaign(id, { status: "executing" });
    return { briefs, count: briefs.length };
  });
}
