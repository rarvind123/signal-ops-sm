import { NextResponse } from "next/server";
import {
  buildImageGenerationPrompt,
  defaultGoalLabel,
  generateCopyForPlatform,
  isValidPlatformAssetCombo,
} from "@/lib/sm/asset-generator";
import { saveSmGeneratedImage } from "@/lib/sm/file-storage";
import {
  generateMarketingImageBytes,
  getAspectRatio,
  logSmImageError,
} from "@/lib/sm/image-gen";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  createGeneratedAsset,
  getClient,
  getCreativeRequest,
  getSignalOpsOutput,
  updateCreativeRequest,
  updateGeneratedAsset,
} from "@/lib/sm/store";
import type { SMAssetType, SMPlatform } from "@/types/sm";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

const MAX_COMBOS_PER_CALL = 2;

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: requestId } = await context.params;
    const body = await req.json();
    const platforms = Array.isArray(body.platforms)
      ? (body.platforms as SMPlatform[])
      : [];
    const asset_types: SMAssetType[] = Array.isArray(body.asset_types)
      ? (body.asset_types as SMAssetType[])
      : ["post"];
    const headline_index = Number(body.headline_index ?? 0);

    const request = await getCreativeRequest(requestId);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const [client, signalops] = await Promise.all([
      getClient(request.client_id),
      getSignalOpsOutput(requestId),
    ]);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!signalops) {
      return NextResponse.json({ error: "SignalOps output not found" }, { status: 400 });
    }

    const headline =
      signalops.headlines[headline_index]?.text ??
      signalops.headlines[0]?.text ??
      client.name;

    const targetPlatforms = platforms.length > 0 ? platforms : request.platforms;
    const combos: Array<{ platform: SMPlatform; assetType: SMAssetType }> = [];

    for (const platform of targetPlatforms) {
      for (const assetType of asset_types) {
        if (isValidPlatformAssetCombo(platform, assetType)) {
          combos.push({ platform, assetType });
        }
      }
    }

    if (combos.length === 0) {
      throw new Error("No valid platform × asset_type combinations.");
    }

    const limited = combos.slice(0, MAX_COMBOS_PER_CALL);
    await updateCreativeRequest(requestId, { status: "processing" });

    const assets = [];

    for (const { platform, assetType } of limited) {
      const pending = await createGeneratedAsset({
        request_id: requestId,
        signalops_id: signalops.id,
        asset_type: assetType,
        platform,
        status: "generating",
      });

      try {
        const prompt = buildImageGenerationPrompt(
          client,
          signalops,
          platform,
          assetType,
          headline
        );

        const aspectRatio = getAspectRatio(platform, assetType);
        const bytes = await generateMarketingImageBytes(prompt, aspectRatio);
        const saved = await saveSmGeneratedImage(pending.id, bytes, ".jpg");

        const copy = await generateCopyForPlatform(
          client,
          signalops,
          platform,
          defaultGoalLabel(request.goal),
          headline
        );

        const done = await updateGeneratedAsset(pending.id, {
          storage_url: saved.publicUrl,
          generation_prompt: prompt,
          headline,
          copy: copy.caption,
          cta: copy.cta,
          status: "done",
          error_message: "",
        });

        assets.push(done);
      } catch (error) {
        const errorMessage = logSmImageError(
          { assetId: pending.id, platform, assetType },
          error
        );
        const failed = await updateGeneratedAsset(pending.id, {
          status: "failed",
          error_message: errorMessage,
        });
        assets.push(failed);
      }
    }

    const allFailed = assets.every((a) => a?.status === "failed");
    await updateCreativeRequest(requestId, { status: allFailed ? "failed" : "done" });

    return { assets: assets.filter(Boolean) };
  });
}
