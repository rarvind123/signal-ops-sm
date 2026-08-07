import { NextResponse } from "next/server";
import { buildCompositeImage } from "@/lib/sm/composite-image";
import type { OverlayOptions } from "@/lib/sm/overlay-options";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { logAuditEvent } from "@/lib/sm/audit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const result = await buildCompositeImage(id);
    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    void logAuditEvent({
      entity_type: "asset",
      entity_id: id,
      action: "download",
      metadata: { filename: result.filename },
    });

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

    const result = await buildCompositeImage(id, overlayOptions, showTextOverlay);
    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    void logAuditEvent({
      entity_type: "asset",
      entity_id: id,
      action: "download",
      metadata: { filename: result.filename, custom_overlay: Boolean(overlayOptions) },
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  });
}
