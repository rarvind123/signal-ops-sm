import { smRouteHandler } from "@/lib/sm/api-auth";
import { getClientGalleryAssets } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: clientId } = await context.params;
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "12", 10) || 12, 1), 48);
    const assets = await getClientGalleryAssets(clientId, limit);
    return { assets };
  });
}
