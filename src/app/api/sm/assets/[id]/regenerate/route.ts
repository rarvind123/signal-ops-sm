import { NextResponse } from "next/server";
import { buildImageGenerationPrompt } from "@/lib/sm/asset-generator";
import { saveSmGeneratedImage } from "@/lib/sm/file-storage";
import {
  generateMarketingImageBytes,
  getAspectRatio,
  logSmImageError,
} from "@/lib/sm/image-gen";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  createAssetVersion,
  getClient,
  getCreativeRequest,
  getGeneratedAsset,
  getSignalOpsOutput,
  listGeneratedAssets,
  updateGeneratedAsset,
} from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const asset = await getGeneratedAsset(id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const [request, signalops, client, siblings] = await Promise.all([
      getCreativeRequest(asset.request_id),
      getSignalOpsOutput(asset.request_id),
      getCreativeRequest(asset.request_id).then((r) =>
        r ? getClient(r.client_id) : null
      ),
      listGeneratedAssets(asset.request_id),
    ]);

    if (!request || !signalops || !client) {
      return NextResponse.json({ error: "Missing generation context" }, { status: 400 });
    }

    if (asset.storage_url) {
      const versionNumber =
        siblings.filter((s) => s.id === asset.id).length > 0 ? siblings.length : 1;
      await createAssetVersion({
        asset_id: asset.id,
        storage_url: asset.storage_url,
        version_number: versionNumber,
      });
    }

    const headline =
      (typeof body.headline === "string" && body.headline.trim()) ||
      asset.headline ||
      signalops.headlines[0]?.text ||
      client.name;

    const prompt =
      (typeof body.generation_prompt === "string" && body.generation_prompt.trim()) ||
      asset.generation_prompt ||
      buildImageGenerationPrompt(
        client,
        signalops,
        asset.platform,
        asset.asset_type,
        headline
      );

    await updateGeneratedAsset(id, { status: "generating", error_message: "" });

    try {
      const aspectRatio = getAspectRatio(asset.platform, asset.asset_type);
      const bytes = await generateMarketingImageBytes(prompt, aspectRatio);
      const saved = await saveSmGeneratedImage(asset.id, bytes, ".jpg");
      return await updateGeneratedAsset(id, {
        storage_url: saved.publicUrl,
        generation_prompt: prompt,
        headline,
        status: "done",
        error_message: "",
      });
    } catch (error) {
      const errorMessage = logSmImageError(
        {
          assetId: id,
          platform: asset.platform,
          assetType: asset.asset_type,
          action: "regenerate",
        },
        error
      );
      return await updateGeneratedAsset(id, {
        status: "failed",
        error_message: errorMessage,
      });
    }
  });
}
