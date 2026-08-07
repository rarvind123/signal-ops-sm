import { NextResponse } from "next/server";
import { overlaySettingsFromOptions } from "@/lib/sm/overlay-options";
import type { OverlayOptions } from "@/lib/sm/overlay-options";
import { enforceBrandKitOverlay } from "@/lib/sm/brand-kit-lock";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { logAuditEvent } from "@/lib/sm/audit";
import { getClient, getCreativeRequest, getGeneratedAsset, updateGeneratedAsset } from "@/lib/sm/store";

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

    const request = await getCreativeRequest(asset.request_id);
    const client = request ? await getClient(request.client_id) : null;
    const overlaySettings = client
      ? enforceBrandKitOverlay(
          client,
          overlaySettingsFromOptions(overlayOptions),
          request?.goal
        )
      : overlaySettingsFromOptions(overlayOptions);

    const updated = await updateGeneratedAsset(id, {
      overlay_settings: overlaySettings,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
    }

    void logAuditEvent({
      entity_type: "asset",
      entity_id: id,
      action: "overlay_saved",
    });

    return updated;
  });
}
