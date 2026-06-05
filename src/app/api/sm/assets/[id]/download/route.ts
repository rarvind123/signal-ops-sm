import { NextResponse } from "next/server";
import { readSmFile, relativePathFromPublicUrl } from "@/lib/sm/file-storage";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getClient, getCreativeRequest, getGeneratedAsset } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const asset = await getGeneratedAsset(id);
    if (!asset?.storage_url) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const relativePath = relativePathFromPublicUrl(asset.storage_url);
    if (!relativePath) {
      return NextResponse.json({ error: "Invalid asset storage URL" }, { status: 404 });
    }

    const request = await getCreativeRequest(asset.request_id);
    const client = request ? await getClient(request.client_id) : null;
    const clientName = (client?.name ?? "brand").replace(/[^a-zA-Z0-9_-]+/g, "-");
    const ext = relativePath.toLowerCase().endsWith(".jpg") ? "jpg" : "png";
    const contentType = ext === "jpg" ? "image/jpeg" : "image/png";
    const filename = `${clientName}-${asset.platform}-${asset.asset_type}.${ext}`;

    const bytes = await readSmFile(relativePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
