import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  createPublishJob,
  getGeneratedAsset,
  getSocialAccount,
  updatePublishJob,
} from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: assetId } = await context.params;
    const body = await req.json();
    const social_account_id = String(body.social_account_id ?? "").trim();
    const scheduled_at = body.scheduled_at ? String(body.scheduled_at) : undefined;

    const asset = await getGeneratedAsset(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (!social_account_id) {
      throw new Error("social_account_id is required");
    }

    const account = await getSocialAccount(social_account_id);
    if (!account) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    const job = await createPublishJob({
      asset_id: assetId,
      social_account_id,
      scheduled_at,
      status: "queued",
    });

    if (scheduled_at && new Date(scheduled_at).getTime() > Date.now()) {
      return job;
    }

    // MVP: direct platform APIs deferred — mark queued for manual publish workflow.
    const updated = await updatePublishJob(job.id, {
      status: "failed",
      error_message:
        "Direct publishing is not wired yet. Download the asset and publish manually, or connect Meta/LinkedIn APIs in a future release.",
    });

    return updated;
  });
}
