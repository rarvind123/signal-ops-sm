import "server-only";

import { readSmFile, relativePathFromPublicUrl } from "@/lib/sm/file-storage";
import { compositeLogoOntoImage } from "@/lib/sm/logo-composite";
import { applyOverlayOptions } from "@/lib/sm/overlay-composite";
import { getOverlayConfig, type LogoPosition } from "@/lib/sm/overlay-config";
import {
  LOGO_SIZE_PX,
  overlayOptionsFromSettings,
  type OverlayOptions,
} from "@/lib/sm/overlay-options";
import { compositeTextOntoImage } from "@/lib/sm/text-composite";
import { enforceBrandKitOverlayOptions, lockedFontId } from "@/lib/sm/brand-kit-lock";
import { recommendFontId } from "@/lib/sm/font-catalogue";
import { firstValidLogoUrl, resolveLogoFromSet } from "@/lib/sm/logo-url";
import {
  logoRegionForPosition,
  sampleImageRegionBrightness,
} from "@/lib/sm/logo-brightness-server";
import { brightnessFromPalette } from "@/lib/sm/logo-selector";
import { layoutRequiresHeadline } from "@/lib/sm/layout-utils";
import {
  getClient,
  getClientLogoUrl,
  getCreativeRequest,
  getGeneratedAsset,
  getSignalOpsOutput,
} from "@/lib/sm/store";
import type { SMClient } from "@/types/sm";
import sharp from "sharp";

async function loadAssetBytes(storageUrl: string): Promise<Buffer> {
  const relativePath = relativePathFromPublicUrl(storageUrl);
  if (relativePath) {
    return readSmFile(relativePath);
  }
  if (storageUrl.startsWith("http")) {
    const res = await fetch(storageUrl);
    if (!res.ok) throw new Error("Failed to fetch asset");
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Invalid asset storage URL");
}

function resolveLogoPosition(
  layoutTemplate: string,
  isConceptAd: boolean,
  isBalancedAd: boolean,
  creativeFormat?: string
): LogoPosition {
  if (isConceptAd || isBalancedAd) return "bottom-right";

  const overlay = getOverlayConfig(
    creativeFormat as Parameters<typeof getOverlayConfig>[0],
    5,
    layoutTemplate as Parameters<typeof getOverlayConfig>[2],
    null
  );
  if (overlay.logoInBand && layoutTemplate === "brand_band_bottom") {
    return "bottom-right";
  }
  return overlay.logoPosition;
}

async function resolveLogoUrlForComposite(
  client: SMClient,
  imageBuffer: Buffer,
  logoPosition: LogoPosition,
  creativeFormat?: string
): Promise<string | null> {
  const formatForced = creativeFormat === "print_ad" || creativeFormat === "outdoor";
  if (formatForced) {
    return (
      resolveLogoFromSet(client.logos, { format: creativeFormat }) ??
      (await getClientLogoUrl(client.id))
    );
  }

  const region = logoRegionForPosition(logoPosition);
  let brightness = await sampleImageRegionBrightness(imageBuffer, region);
  const paletteBrightness = brightnessFromPalette(client.color_palette);
  if (brightness === 128 && paletteBrightness !== undefined) {
    brightness = paletteBrightness;
  }

  const picked =
    resolveLogoFromSet(client.logos, {
      format: creativeFormat,
      brightness,
    }) ?? (await getClientLogoUrl(client.id));

  return firstValidLogoUrl(picked);
}

export async function buildCompositeImage(
  id: string,
  overlayOptions?: Partial<OverlayOptions>,
  showTextOverlay = true
): Promise<{ buffer: Buffer; filename: string } | null> {
  const asset = await getGeneratedAsset(id);
  if (!asset?.storage_url) return null;

  let imageBuffer = await loadAssetBytes(asset.storage_url);

  const request = await getCreativeRequest(asset.request_id);
  const client = request ? await getClient(request.client_id) : null;
  const signalops = request ? await getSignalOpsOutput(request.id) : null;
  const visualApproach = signalops?.visual_approach;

  const savedOptions = overlayOptionsFromSettings(asset.overlay_settings);
  let mergedOptions: OverlayOptions = {
    ...savedOptions,
    ...(overlayOptions ?? {}),
  };
  if (client) {
    mergedOptions = enforceBrandKitOverlayOptions(client, mergedOptions, request?.goal);
  }

  const copyDependency = visualApproach?.copy_dependency ?? 3;
  const isConceptAd =
    visualApproach?.image_is_the_ad === true || copyDependency <= 2;
  const isBalancedAd = !isConceptAd && copyDependency === 3;
  const layoutTemplate = asset.layout_template ?? "full_bleed_gradient";
  const headlineLayout = layoutRequiresHeadline(layoutTemplate);
  const shouldCompositeText =
    Boolean(asset.headline) && (headlineLayout || showTextOverlay);

  const logoStyle = mergedOptions.logoStyle;
  const logoSizeKey = mergedOptions.logoSize;

  const logoPosition = resolveLogoPosition(
    layoutTemplate,
    isConceptAd,
    isBalancedAd,
    request?.creative_format
  );
  const logoOnSolidBand =
    layoutTemplate === "brand_band_bottom" || layoutTemplate === "brand_band_left";

  try {
    if (client && logoStyle !== "none") {
      const logoUrl = await resolveLogoUrlForComposite(
        client,
        imageBuffer,
        logoPosition,
        request?.creative_format
      );
      if (logoUrl) {
        const { width = 1080 } = await sharp(imageBuffer).metadata();
        const targetHeight = Math.round((LOGO_SIZE_PX[logoSizeKey] / 1080) * width);
        imageBuffer = await compositeLogoOntoImage(imageBuffer, logoUrl, logoPosition, {
          skipGlow: logoOnSolidBand || logoStyle !== "box",
          targetHeight,
          logoStyle,
        });
      }
    }
  } catch (e) {
    console.warn("[composite] Logo composite failed:", e);
  }

  const strategyHeadline =
    signalops?.headlines.find((h) => h.text === asset.headline) ??
    signalops?.headlines[0] ??
    null;
  const headlineForComposite =
    asset.headline?.trim() || strategyHeadline?.text || "";

  const selectedFontId =
    mergedOptions.selectedFontId ??
    lockedFontId(client!, client?.tone, request?.goal) ??
    recommendFontId(client?.tone, request?.goal);

  if (shouldCompositeText && headlineForComposite) {
    try {
      imageBuffer = await compositeTextOntoImage(
        imageBuffer,
        headlineForComposite,
        client ?? undefined,
        {
          setup: strategyHeadline?.setup,
          punch: strategyHeadline?.punch,
          emphasis_word: strategyHeadline?.emphasis_word,
          creative_format: request?.creative_format,
          layout_template: layoutTemplate,
          text_position: mergedOptions.textPosition,
          text_size: mergedOptions.textSize,
          selected_font_id: selectedFontId,
        }
      );
    } catch (e) {
      console.warn("[composite] Text composite failed:", e);
    }
  }

  imageBuffer = await applyOverlayOptions(imageBuffer, mergedOptions, {
    selectedFontId,
    tone: client?.tone,
  });

  const clientName = (client?.name ?? "brand").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `${clientName}-${asset.platform}-${asset.asset_type}.jpg`;

  return { buffer: imageBuffer, filename };
}
