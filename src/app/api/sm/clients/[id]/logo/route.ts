import { smRouteHandler } from "@/lib/sm/api-auth";
import { getClientLogoUrl } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const logo_url = await getClientLogoUrl(id);
    return { logo_url };
  });
}
