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
  updateCreativeBrief,
} from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const briefs = await getCampaignBriefs(id);
    return { briefs };
  });
}

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { max_items?: number };
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

    const existingBriefs = await getCampaignBriefs(id);
    const itemsToBrief = calendarItems.filter((item) => {
      const existing = existingBriefs.find((brief) => brief.calendar_item_id === item.id);
      return !existing || !existing.scene_description?.trim();
    });

    if (itemsToBrief.length === 0) {
      return { briefs: existingBriefs, count: existingBriefs.length };
    }

    const maxItems = Math.max(1, Math.min(Number(body.max_items) || itemsToBrief.length, 3));
    const batch = itemsToBrief.slice(0, maxItems);
    const briefs = [...existingBriefs];

    for (const item of batch) {
      const briefData = await generateCreativeBrief(client, campaign, strategy, item);
      const payload = {
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
        status: "pending" as const,
      };

      const existing = existingBriefs.find((brief) => brief.calendar_item_id === item.id);
      const saved = existing
        ? await updateCreativeBrief(existing.id, payload)
        : await saveCreativeBrief({
            calendar_item_id: item.id,
            campaign_id: id,
            ...payload,
          });

      await updateCalendarItemStatus(item.id, "brief_ready");
      const idx = briefs.findIndex((brief) => brief.id === saved.id);
      if (idx >= 0) briefs[idx] = saved;
      else briefs.push(saved);
    }

    await updateCampaign(id, { status: "executing" });
    return { briefs, count: briefs.length };
  });
}
