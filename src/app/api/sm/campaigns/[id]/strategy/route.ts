import { NextResponse } from "next/server";
import { runCampaignStrategyEngine } from "@/lib/sm/campaign-strategy-engine";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getCampaign,
  getCampaignStrategy,
  getClient,
  saveCampaignStrategy,
  updateCampaign,
} from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const strategy = await getCampaignStrategy(id);
    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }
    return strategy;
  });
}

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const client = await getClient(campaign.client_id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const output = await runCampaignStrategyEngine(client, campaign);
    const saved = await saveCampaignStrategy({
      campaign_id: id,
      ...output,
    });
    await updateCampaign(id, { status: "strategy_ready" });
    return saved;
  });
}
