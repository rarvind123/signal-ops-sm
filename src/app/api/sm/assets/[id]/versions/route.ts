import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getGeneratedAsset, listAssetVersions } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id } = await context.params;
    const asset = await getGeneratedAsset(id);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    const versions = await listAssetVersions(id);
    return { asset_id: id, versions };
  });
}
