import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { saveSmUpload } from "@/lib/sm/file-storage";
import { createBrandAsset, getClient } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: clientId } = await context.params;
    const client = await getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "image");

    if (!(file instanceof File)) {
      throw new Error("file is required");
    }
    if (!["logo", "image", "video"].includes(type)) {
      throw new Error("type must be logo, image, or video");
    }

    const saved = await saveSmUpload(clientId, file, "assets");
    const asset = await createBrandAsset({
      client_id: clientId,
      type: type as "logo" | "image" | "video",
      storage_url: saved.publicUrl,
      metadata: saved.metadata,
    });

    return asset;
  });
}
