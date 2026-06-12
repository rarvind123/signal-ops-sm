import { NextResponse } from "next/server";
import { readSmFile, relativePathFromPublicUrl } from "@/lib/sm/file-storage";
import { compositeLogoOntoImage } from "@/lib/sm/logo-composite";
import { applyOverlayOptions } from "@/lib/sm/overlay-composite";
import { getOverlayConfig } from "@/lib/sm/overlay-config";
import {
  LOGO_SIZE_PX,
  type OverlayOptions,
} from "@/lib/sm/overlay-options";
import { compositeTextOntoImage } from "@/lib/sm/text-composite";
import { getClientTypography } from "@/lib/sm/typography";
import sharp from "sharp";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getClient,
  getClientLogoUrl,
  getCreativeRequest,
  getGeneratedAsset,
  getSignalOpsOutput,
} from "@/lib/sm/store";
import type { LogoPosition } from "@/lib/sm/overlay-config";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

async function buildDownloadImage(
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

  const copyDependency = visualApproach?.copy_dependency ?? 3;
  const isConceptAd =
    visualApproach?.image_is_the_ad === true || copyDependency <= 2;
  const isBalancedAd = !isConceptAd && copyDependency === 3;
  const shouldCompositeText =
    Boolean(asset.headline) && !isConceptAd && showTextOverlay;

  const layoutTemplate = asset.layout_template ?? "full_bleed_gradient";
  const logoStyle = overlayOptions?.logoStyle ?? "box";
  const logoSizeKey = overlayOptions?.logoSize ?? "md";

  const logoPosition = resolveLogoPosition(
    layoutTemplate,
    isConceptAd,
    isBalancedAd,
    request?.creative_format
  );
  const logoOnSolidBand =
    layoutTemplate === "brand_band_bottom" || layoutTemplate === "brand_band_left";

  try {
    const logoUrl = client ? await getClientLogoUrl(client.id) : null;
    if (logoUrl && logoStyle !== "none") {
      const { width = 1080 } = await sharp(imageBuffer).metadata();
      const targetHeight = Math.round(
        (LOGO_SIZE_PX[logoSizeKey] / 1080) * width
      );
      imageBuffer = await compositeLogoOntoImage(imageBuffer, logoUrl, logoPosition, {
        skipGlow: logoOnSolidBand || logoStyle !== "box",
        targetHeight,
        logoStyle,
      });
    }
  } catch (e) {
    console.warn("[download] Logo composite failed, serving without logo:", e);
  }

  if (shouldCompositeText) {
    try {
      const headlineMeta = signalops?.headlines.find((h) => h.text === asset.headline);

      imageBuffer = await compositeTextOntoImage(
        imageBuffer,
        asset.headline!,
        client ?? undefined,
        {
          setup: headlineMeta?.setup,
          punch: headlineMeta?.punch,
          emphasis_word: headlineMeta?.emphasis_word,
          creative_format: request?.creative_format,
          layout_template: layoutTemplate,
          text_position: overlayOptions?.textPosition,
          text_size: overlayOptions?.textSize,
        }
      );
    } catch (e) {
      console.warn("[download] Text composite failed, serving without text:", e);
    }
  }

  const fontStack = client ? getClientTypography(client).fontStack : undefined;
  imageBuffer = await applyOverlayOptions(imageBuffer, overlayOptions, fontStack);

  const clientName = (client?.name ?? "brand").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const filename = `${clientName}-${asset.platform}-${asset.asset_type}.jpg`;

  return { buffer: imageBuffer, filename };
}


export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const result = await buildDownloadImage(id);
    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  });
}

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const overlayOptions = body.overlay_options as Partial<OverlayOptions> | undefined;
    const showTextOverlay = body.show_text_overlay !== false;

    const result = await buildDownloadImage(id, overlayOptions, showTextOverlay);
    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  });
}
