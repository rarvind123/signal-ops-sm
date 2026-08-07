import { NextResponse } from "next/server";
import { buildImageGenerationPrompt } from "@/lib/sm/asset-generator";
import { saveSmGeneratedImage } from "@/lib/sm/file-storage";
import {
  generateMarketingImageBytes,
  getAspectRatio,
  logSmImageError,
} from "@/lib/sm/image-gen";
import {
  checkMandatoryElementsInImage,
  mandatoryRetrySuffix,
} from "@/lib/sm/mandatory-elements-check";
import { sceneMustIncludeForCheck } from "@/lib/sm/must-include";
import { resolveVisualResearch, refsForFalEdit } from "@/lib/sm/visual-research";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  createAssetVersion,
  createRevisionRound,
  getClient,
  getCreativeRequest,
  getGeneratedAsset,
  getSignalOpsOutput,
  listAssetVersions,
  nextRevisionRoundNumber,
  updateGeneratedAsset,
} from "@/lib/sm/store";
import { logAuditEvent } from "@/lib/sm/audit";

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

    const [request, signalops, client] = await Promise.all([
      getCreativeRequest(asset.request_id),
      getSignalOpsOutput(asset.request_id),
      getCreativeRequest(asset.request_id).then((r) =>
        r ? getClient(r.client_id) : null
      ),
    ]);

    if (!request || !signalops || !client) {
      return NextResponse.json({ error: "Missing generation context" }, { status: 400 });
    }

    const userDirection =
      typeof body.direction === "string" && body.direction.trim()
        ? body.direction.trim()
        : null;

    if (asset.storage_url) {
      const versions = await listAssetVersions(asset.id);
      const versionNumber = versions.length + 1;
      await createAssetVersion({
        asset_id: asset.id,
        storage_url: asset.storage_url,
        version_number: versionNumber,
        change_note: userDirection ?? "Regenerated",
        created_by: "team",
      });
      const roundNumber = await nextRevisionRoundNumber(asset.id);
      await createRevisionRound({
        request_id: asset.request_id,
        asset_id: asset.id,
        round_number: roundNumber,
        direction: userDirection ?? undefined,
      });
    }

    const headline =
      (typeof body.headline === "string" && body.headline.trim()) ||
      asset.headline ||
      signalops.headlines[0]?.text ||
      client.name;

    // Reuse strategy-time research so redo stays locked to the approved idea.
    const visualResearch = await resolveVisualResearch({
      client,
      request,
      signalops,
    });
    const falRefs = refsForFalEdit(
      request.uploaded_image_urls,
      visualResearch.referenceImageUrls
    );
    const referenceImageUrls = falRefs.urls;
    const promptExtras = {
      referenceImageUrls,
      userReferenceUrls: request.uploaded_image_urls,
      styleBrief: visualResearch.styleBrief,
    };

    // Always rebuild unless caller passes an explicit generation_prompt override.
    // Reusing old prompts re-bakes checklist text and ignores reference images.
    const rebuilt = buildImageGenerationPrompt(
      client,
      signalops,
      asset.platform,
      asset.asset_type,
      headline,
      request.creative_format,
      request,
      promptExtras
    );
    const prompt =
      (typeof body.generation_prompt === "string" && body.generation_prompt.trim()) ||
      (userDirection ? `${userDirection}. ${rebuilt}`.slice(0, 3800) : rebuilt);

    await updateGeneratedAsset(id, { status: "generating", error_message: "" });

    try {
      const aspectRatio = getAspectRatio(asset.platform, asset.asset_type);
      const genOpts = {
        referenceImageUrls,
        userReferenceUrls: request.uploaded_image_urls,
        seed: Date.now() + Math.floor(Math.random() * 10_000),
      };
      const sceneMustCheck = sceneMustIncludeForCheck(request.must_include);
      let finalPrompt = prompt;
      let bytes = await generateMarketingImageBytes(
        finalPrompt,
        aspectRatio,
        genOpts
      );
      let saved = await saveSmGeneratedImage(asset.id, bytes, ".jpg");

      if (sceneMustCheck) {
        const check = await checkMandatoryElementsInImage(
          saved.publicUrl,
          sceneMustCheck
        );
        if (!check.pass) {
          finalPrompt = `${mandatoryRetrySuffix(sceneMustCheck, check.missing)}. ${finalPrompt}`
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 3800);
          bytes = await generateMarketingImageBytes(
            finalPrompt,
            aspectRatio,
            genOpts
          );
          saved = await saveSmGeneratedImage(asset.id, bytes, ".jpg");
        }
      }

      const updated = await updateGeneratedAsset(id, {
        storage_url: saved.publicUrl,
        generation_prompt: finalPrompt,
        headline,
        status: "done",
        error_message: "",
        approval_status: "pending",
      });

      void logAuditEvent({
        entity_type: "asset",
        entity_id: id,
        action: "regenerate",
        metadata: { direction: userDirection },
      });

      return updated;
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
