import { NextResponse } from "next/server";
import {
  deriveSuggestedDate,
  generateCampaignCalendar,
} from "@/lib/sm/campaign-calendar-engine";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  bulkCreateCalendarItems,
  deleteCalendarItemsForCampaign,
  getCalendarItems,
  getCampaign,
  getCampaignStrategy,
  getClient,
  updateCampaign,
} from "@/lib/sm/store";
import type { SMContentFormat } from "@/types/sm";

export const runtime = "nodejs";
export const maxDuration = 180;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    return getCalendarItems(id);
  });
}

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [client, strategy] = await Promise.all([
      getClient(campaign.client_id),
      getCampaignStrategy(id),
    ]);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found — run strategy first" }, { status: 400 });
    }

    const expectedPosts = Object.values(strategy.content_mix).reduce(
      (sum, count) => sum + (count ?? 0),
      0
    );

    const rawItems = await generateCampaignCalendar(client, campaign, strategy);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { error: "Calendar generation returned no posts — please try again." },
        { status: 502 }
      );
    }
    if (expectedPosts > 0 && rawItems.length !== expectedPosts) {
      return NextResponse.json(
        {
          error: `Calendar generation returned ${rawItems.length} of ${expectedPosts} posts — please try again.`,
        },
        { status: 502 }
      );
    }

    const items = rawItems.map((item) => ({
      campaign_id: id,
      strategy_id: strategy.id,
      post_number: item.post_number,
      week_number: item.week_number,
      format: item.format as SMContentFormat,
      pillar: item.pillar,
      story_phase: item.story_phase,
      strategic_purpose: item.strategic_purpose,
      suggested_date: deriveSuggestedDate(
        campaign.created_at,
        item.week_number,
        item.suggested_day
      ),
      status: "brief_pending" as const,
    }));

    await deleteCalendarItemsForCampaign(id);
    const saved = await bulkCreateCalendarItems(items);
    if (saved.length === 0) {
      return NextResponse.json(
        { error: "Failed to save calendar items — please try again." },
        { status: 500 }
      );
    }

    await updateCampaign(id, { status: "calendar_ready" });
    return { items: saved, count: saved.length };
  });
}
