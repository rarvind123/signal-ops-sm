import { NextResponse } from "next/server";
import { readSmFile, relativePathFromPublicUrl } from "@/lib/sm/file-storage";
import { compositeLogoOntoImage } from "@/lib/sm/logo-composite";
import { applyOverlayOptions } from "@/lib/sm/overlay-composite";
import type { OverlayOptions } from "@/lib/sm/overlay-options";
import { compositeTextOntoImage } from "@/lib/sm/text-composite";
import { getClientTypography } from "@/lib/sm/typography";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getClient,
  getClientLogoUrl,
  getCreativeRequest,
  getGeneratedAsset,
  getSignalOpsOutput,
} from "@/lib/sm/store";

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

async function buildDownloadImage(
  id: string,
  overlayOptions?: Partial<OverlayOptions>
): Promise<{ buffer: Buffer; filename: string } | null> {
  const asset = await getGeneratedAsset(id);
  if (!asset?.storage_url) return null;

  let imageBuffer = await loadAssetBytes(asset.storage_url);

  const request = await getCreativeRequest(asset.request_id);
  const client = request ? await getClient(request.client_id) : null;

  const layoutTemplate = asset.layout_template ?? "full_bleed_gradient";
  const logoPosition =
    layoutTemplate === "brand_band_bottom"
      ? "bottom-right"
      : layoutTemplate === "brand_band_left"
        ? "top-left"
        : layoutTemplate === "full_bleed_top_text"
          ? "bottom-right"
          : "top-right";
  const logoOnSolidBand =
    layoutTemplate === "brand_band_bottom" || layoutTemplate === "brand_band_left";

  try {
    const logoUrl = client ? await getClientLogoUrl(client.id) : null;
    if (logoUrl) {
      imageBuffer = await compositeLogoOntoImage(imageBuffer, logoUrl, logoPosition, {
        skipGlow: logoOnSolidBand,
      });
    }
  } catch (e) {
    console.warn("[download] Logo composite failed, serving without logo:", e);
  }

  if (asset.headline) {
    try {
      const signalops = request ? await getSignalOpsOutput(request.id) : null;
      const headlineMeta = signalops?.headlines.find((h) => h.text === asset.headline);

      imageBuffer = await compositeTextOntoImage(
        imageBuffer,
        asset.headline,
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

    const result = await buildDownloadImage(id, overlayOptions);
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
