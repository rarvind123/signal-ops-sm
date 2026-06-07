import { smRouteHandler } from "@/lib/sm/api-auth";
import { listCampaigns } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id: clientId } = await context.params;
    const campaigns = await listCampaigns(clientId);
    return campaigns[0] ?? null;
  });
}
