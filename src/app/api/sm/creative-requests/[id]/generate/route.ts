import { NextResponse } from "next/server";
import { fluxAspectRatioForAdSize, getAdSize } from "@/lib/sm/ad-sizes";
import {
  buildImageGenerationPrompt,
  defaultGoalLabel,
  generateCopyForPlatform,
  isValidPlatformAssetCombo,
} from "@/lib/sm/asset-generator";
import { getFormat } from "@/lib/sm/creative-formats";
import { saveSmGeneratedImage } from "@/lib/sm/file-storage";
import {
  generateMarketingImageBytes,
  getAspectRatio,
  logSmImageError,
  type FluxAspectRatio,
} from "@/lib/sm/image-gen";
import {
  checkMandatoryElementsInImage,
  mandatoryRetrySuffix,
} from "@/lib/sm/mandatory-elements-check";
import { enforceBrandKitOverlay, lockedFontId } from "@/lib/sm/brand-kit-lock";
import { logAuditEvent } from "@/lib/sm/audit";
import {
  copyFactsOverlayText,
  sceneMustIncludeForCheck,
} from "@/lib/sm/must-include";
import { resolveVisualResearch, refsForFalEdit } from "@/lib/sm/visual-research";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { SIGNALOPS_TM } from "@/lib/sm/ui";
import { generateTVScript } from "@/lib/sm/tv-script";
import {
  createGeneratedAsset,
  getClient,
  getCreativeRequest,
  getSignalOpsOutput,
  listGeneratedAssets,
  updateCreativeRequest,
  updateGeneratedAsset,
  updateSignalOpsVisualApproach,
} from "@/lib/sm/store";
import type {
  SMAssetType,
  SMOverlaySettings,
  SMPlatform,
  SMVisualApproachMode,
} from "@/types/sm";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

const MAX_COMBOS_PER_CALL = 2;
const EXPLORE_DIRECTION_COUNT = 3;

type ExploreDirection = {
  label: string;
  headline_index: number;
  visual_approach_mode?: SMVisualApproachMode;
};

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
    const explore = body.explore === true;
    const headline_index = Number(body.headline_index ?? 0);
    const visualApproachOverride = body.visual_approach_override as
      | SMVisualApproachMode
      | undefined;
    const sceneDescriptionOverride =
      typeof body.scene_description_override === "string" &&
      body.scene_description_override.trim()
        ? body.scene_description_override.trim()
        : undefined;

    const request = await getCreativeRequest(requestId);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const [client, signalopsRow, existingAssets] = await Promise.all([
      getClient(request.client_id),
      getSignalOpsOutput(requestId),
      listGeneratedAssets(requestId),
    ]);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!signalopsRow) {
      return NextResponse.json({ error: `${SIGNALOPS_TM} output not found` }, { status: 400 });
    }

    let signalops = signalopsRow;
    let strategyChanged = false;
    if ((visualApproachOverride || sceneDescriptionOverride) && signalops.visual_approach) {
      const mode = visualApproachOverride ?? signalops.visual_approach.mode;
      const nextApproach = {
        ...signalops.visual_approach,
        mode,
        scene_description:
          sceneDescriptionOverride ?? signalops.visual_approach.scene_description,
        product_visible: false,
      };
      signalops = {
        ...signalops,
        visual_approach: nextApproach,
      };
      strategyChanged = true;
      // Persist so redo / later generations keep the creative angle.
      await updateSignalOpsVisualApproach(requestId, nextApproach);
    }

    // Carry forward logo size / overlay choices from the latest sibling asset.
    const priorOverlay = [...existingAssets]
      .reverse()
      .find((a) => a.overlay_settings && Object.keys(a.overlay_settings).length > 0)
      ?.overlay_settings;

    // Offer facts are fine-print only (prefilled, OFF by default) so they never
    // replace the SignalOps strategy headline as the hero message.
    const copyOverlay = copyFactsOverlayText(request.must_include);
    const factsOverlay: SMOverlaySettings | undefined =
      !priorOverlay?.extra_text_content && copyOverlay
        ? {
            extra_text_enabled: false,
            extra_text_content: copyOverlay,
            extra_text_position: "bottom-center",
          }
        : undefined;
    const seedOverlay: SMOverlaySettings = enforceBrandKitOverlay(
      client,
      {
        ...(factsOverlay ?? {}),
        ...(priorOverlay ?? {}),
        selected_font_id:
          priorOverlay?.selected_font_id ??
          lockedFontId(client, client.tone, request.goal) ??
          undefined,
      },
      request.goal
    );

    const sceneMustCheck = sceneMustIncludeForCheck(request.must_include);

    // Use post-strategy visual research cache; refresh only if approach changed.
    const visualResearch = await resolveVisualResearch({
      client,
      request,
      signalops,
      forceRefresh: strategyChanged,
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
    console.info(
      `[generate] visual-research ${visualResearch.fromCache ? "cache" : "live"} ` +
        `category=${visualResearch.categoryHint} fal_refs=${referenceImageUrls.length} ` +
        `userOnly=${falRefs.userOnly} user_uploads=${request.uploaded_image_urls?.length ?? 0}`
    );

    const format = getFormat(request.creative_format);

    const targetPlatforms = platforms.length > 0 ? platforms : request.platforms;
    const platform = targetPlatforms[0] ?? "instagram";
    const assetType = asset_types[0] ?? "post";

    let workItems: Array<{
      platform: SMPlatform;
      assetType: SMAssetType;
      headline: string;
      headlineIndex: number;
      exploreLabel?: string;
      signalopsForGen: typeof signalops;
    }> = [];

    if (explore) {
      const baseMode = (signalops.visual_approach?.mode ??
        "concept_first") as SMVisualApproachMode;
      const headlineCount = Math.max(signalops.headlines.length, 1);
      const directions = [
        { label: "Strategy pick", headline_index, visual_approach_mode: baseMode },
        {
          label: "Alt headline",
          headline_index: (headline_index + 1) % headlineCount,
          visual_approach_mode: baseMode,
        },
        {
          label: "Brave visual",
          headline_index,
          visual_approach_mode: "visual_tension" as SMVisualApproachMode,
        },
      ].slice(0, EXPLORE_DIRECTION_COUNT) as ExploreDirection[];

      workItems = directions.map((dir) => {
        const headlineIdx = dir.headline_index;
        const headlineText =
          signalops.headlines[headlineIdx]?.text ??
          signalops.headlines[0]?.text ??
          client.name;
        let signalopsForGen = signalops;
        if (
          dir.visual_approach_mode &&
          signalops.visual_approach &&
          dir.visual_approach_mode !== signalops.visual_approach.mode
        ) {
          signalopsForGen = {
            ...signalops,
            visual_approach: {
              ...signalops.visual_approach,
              mode: dir.visual_approach_mode,
            },
          };
        }
        return {
          platform,
          assetType,
          headline: headlineText,
          headlineIndex: headlineIdx,
          exploreLabel: dir.label,
          signalopsForGen,
        };
      });
    } else {
      const headline =
        signalops.headlines[headline_index]?.text ??
        signalops.headlines[0]?.text ??
        client.name;

      const combos: Array<{ platform: SMPlatform; assetType: SMAssetType }> = [];
      for (const p of targetPlatforms) {
        for (const at of asset_types) {
          if (isValidPlatformAssetCombo(p, at) || format.output_type === "text") {
            combos.push({ platform: p, assetType: at });
          }
        }
      }
      if (combos.length === 0) {
        combos.push({ platform: "instagram", assetType: "post" });
      }
      const limited = combos.slice(0, MAX_COMBOS_PER_CALL);
      workItems = limited.map((combo) => ({
        ...combo,
        headline,
        headlineIndex: headline_index,
        signalopsForGen: signalops,
      }));
    }

    await updateCreativeRequest(requestId, { status: "processing" });

    const assets = [];

    for (const item of workItems) {
      const { platform: plat, assetType: aType, headline, signalopsForGen, exploreLabel } = item;
      const pending = await createGeneratedAsset({
        request_id: requestId,
        signalops_id: signalops.id,
        asset_type: aType,
        platform: plat,
        layout_template: signalopsForGen.layout_template,
        ad_size_id: request.ad_size_id,
        overlay_settings: seedOverlay,
        explore_label: exploreLabel,
        status: "generating",
      });

      try {
        if (format.output_type === "text") {
          const script = await generateTVScript(client, signalops, request, headline);
          const done = await updateGeneratedAsset(pending.id, {
            copy: script,
            headline,
            status: "done",
            error_message: "",
          });
          assets.push(done);
          continue;
        }

        let prompt = buildImageGenerationPrompt(
          client,
          signalopsForGen,
          plat,
          aType,
          headline,
          request.creative_format,
          request,
          promptExtras
        );
        // Traceable research footer for debugging (does not affect model much; truncated earlier).

        let aspectRatio: FluxAspectRatio =
          format.default_aspect_ratio ?? getAspectRatio(plat, aType);

        if (request.ad_size_id && request.creative_format) {
          const size = getAdSize(request.creative_format, request.ad_size_id);
          if (size) {
            aspectRatio = fluxAspectRatioForAdSize(size);
          }
        }

        const genOpts = {
          referenceImageUrls,
          userReferenceUrls: request.uploaded_image_urls,
          seed: Date.now() + Math.floor(Math.random() * 10_000),
        };
        let bytes = await generateMarketingImageBytes(prompt, aspectRatio, genOpts);
        let saved = await saveSmGeneratedImage(pending.id, bytes, ".jpg");

        // Validate scene subjects only — never require fee/location as painted text.
        if (sceneMustCheck) {
          const check = await checkMandatoryElementsInImage(
            saved.publicUrl,
            sceneMustCheck
          );
          if (!check.pass) {
            console.warn(
              `[generate] Mandatory elements missing for ${pending.id}:`,
              check.missing,
              check.notes
            );
            const reinforced = `${mandatoryRetrySuffix(sceneMustCheck, check.missing)}. ${prompt}`
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 3800);
            bytes = await generateMarketingImageBytes(
              reinforced,
              aspectRatio,
              genOpts
            );
            saved = await saveSmGeneratedImage(pending.id, bytes, ".jpg");
            prompt = reinforced;
          }
        }

        let caption = "";
        let cta = "Learn More";
        if (format.copy_constraints.max_body_words > 0) {
          const copy = await generateCopyForPlatform(
            client,
            signalopsForGen,
            plat,
            defaultGoalLabel(request.goal),
            headline
          );
          caption = copy.caption;
          cta = copy.cta;
        }

        const done = await updateGeneratedAsset(pending.id, {
          storage_url: saved.publicUrl,
          generation_prompt: prompt,
          headline,
          copy: caption,
          cta,
          status: "done",
          error_message: "",
        });

        assets.push(done);
      } catch (error) {
        const errorMessage = logSmImageError(
          { assetId: pending.id, platform: plat, assetType: aType },
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

    void logAuditEvent({
      entity_type: "request",
      entity_id: requestId,
      action: explore ? "explore_generate" : "generate",
      metadata: { asset_count: assets.length },
    });

    return { assets: assets.filter(Boolean) };
  });
}
