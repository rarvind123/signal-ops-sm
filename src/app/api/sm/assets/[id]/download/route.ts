import { NextResponse } from "next/server";
import { readSmFile, relativePathFromPublicUrl } from "@/lib/sm/file-storage";
import { compositeLogoOntoImage } from "@/lib/sm/logo-composite";
import { smRouteHandler } from "@/lib/sm/api-auth";
import {
  getClient,
  getClientLogoUrl,
  getCreativeRequest,
  getGeneratedAsset,
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

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const asset = await getGeneratedAsset(id);
    if (!asset?.storage_url) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    let imageBuffer = await loadAssetBytes(asset.storage_url);

    const request = await getCreativeRequest(asset.request_id);
    const client = request ? await getClient(request.client_id) : null;

    try {
      const logoUrl = client ? await getClientLogoUrl(client.id) : null;
      if (logoUrl) {
        imageBuffer = await compositeLogoOntoImage(imageBuffer, logoUrl, "top-right");
      }
    } catch (e) {
      console.warn("[download] Logo composite failed, serving without logo:", e);
    }

    const clientName = (client?.name ?? "brand").replace(/[^a-zA-Z0-9_-]+/g, "-");
    const filename = `${clientName}-${asset.platform}-${asset.asset_type}.jpg`;

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
