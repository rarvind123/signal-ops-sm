import { NextResponse } from "next/server";
import { buildCompositeImage } from "@/lib/sm/composite-image";
import { smRouteHandler } from "@/lib/sm/api-auth";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const showTextOverlay = searchParams.get("show_text") !== "false";

    const result = await buildCompositeImage(id, undefined, showTextOverlay);
    if (!result) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=60",
      },
    });
  });
}
