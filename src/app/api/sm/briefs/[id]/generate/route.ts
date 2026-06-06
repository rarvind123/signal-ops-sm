import { NextResponse } from "next/server";
import { buildBriefImagePrompt } from "@/lib/sm/asset-generator";
import { saveSmGeneratedImage } from "@/lib/sm/file-storage";
import {
  generateMarketingImageBytes,
  logSmImageError,
} from "@/lib/sm/image-gen";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  createCreativeRequest,
  createGeneratedAsset,
  getCampaign,
  getClient,
  getCreativeBrief,
  updateBriefStatus,
  updateCalendarItemStatus,
  updateGeneratedAsset,
} from "@/lib/sm/store";
import type { SMPlatform, SMVisualApproachMode } from "@/types/sm";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const brief = await getCreativeBrief(id);
    if (!brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }
    if (!brief.scene_description) {
      return NextResponse.json({ error: "Brief has no scene description" }, { status: 400 });
    }

    const campaign = await getCampaign(brief.campaign_id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const client = await getClient(campaign.client_id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const platform: SMPlatform = campaign.platforms[0] ?? "instagram";
    const mode = (brief.visual_approach_mode ?? "concept_first") as SMVisualApproachMode;

    await updateBriefStatus(id, "generating");

    const request = await createCreativeRequest({
      client_id: client.id,
      brief_text: `[Campaign ${campaign.name}] Post #${brief.post_number}: ${brief.hook}`,
      platforms: campaign.platforms.length > 0 ? campaign.platforms : [platform],
      goal: campaign.objective === "conversion" ? "cta" : "awareness",
      uploaded_image_urls: [],
      creative_format: "social_media",
      creative_lens: "signalops",
    });

    const pending = await createGeneratedAsset({
      request_id: request.id,
      asset_type: "post",
      platform,
      status: "generating",
    });

    try {
      const prompt = buildBriefImagePrompt(brief.scene_description, mode, platform);
      const bytes = await generateMarketingImageBytes(prompt, "1:1");
      const saved = await saveSmGeneratedImage(pending.id, bytes, ".jpg");

      const done = await updateGeneratedAsset(pending.id, {
        storage_url: saved.publicUrl,
        generation_prompt: prompt,
        headline: brief.hook,
        copy: brief.caption_direction,
        cta: brief.cta,
        status: "done",
        error_message: "",
      });

      await updateBriefStatus(id, "done", done?.id);
      await updateCalendarItemStatus(brief.calendar_item_id, "done");

      return { asset: done, brief_id: id };
    } catch (error) {
      const errorMessage = logSmImageError({ assetId: pending.id, platform }, error);
      await updateGeneratedAsset(pending.id, {
        status: "failed",
        error_message: errorMessage,
      });
      await updateBriefStatus(id, "pending");
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
