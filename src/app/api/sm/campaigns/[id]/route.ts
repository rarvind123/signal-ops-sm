import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getCalendarItems,
  getCampaign,
  getCampaignStrategy,
  updateCampaign,
} from "@/lib/sm/store";
import type { SMCampaign } from "@/types/sm";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const [strategy, calendar] = await Promise.all([
      getCampaignStrategy(id),
      getCalendarItems(id),
    ]);

    let resolvedCampaign = campaign;
    if (campaign.status === "calendar_ready" && calendar.length === 0) {
      const healed = await updateCampaign(id, { status: "strategy_ready" });
      if (healed) resolvedCampaign = healed;
    }

    return { campaign: resolvedCampaign, strategy, calendar_count: calendar.length };
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = (await req.json()) as Partial<SMCampaign>;
    const updated = await updateCampaign(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return updated;
  });
}
