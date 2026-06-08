import { NextResponse } from "next/server";
import { overlaySettingsFromOptions } from "@/lib/sm/overlay-options";
import type { OverlayOptions } from "@/lib/sm/overlay-options";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getGeneratedAsset, updateGeneratedAsset } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const asset = await getGeneratedAsset(id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const overlayOptions = body.overlay_options as OverlayOptions | undefined;
    if (!overlayOptions) {
      return NextResponse.json({ error: "overlay_options required" }, { status: 400 });
    }

    const updated = await updateGeneratedAsset(id, {
      overlay_settings: overlaySettingsFromOptions(overlayOptions),
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
    }

    return updated;
  });
}
