import { smRouteHandler } from "@/lib/sm/api-auth";
import { runBatchBriefGeneration } from "@/lib/sm/batch-brief-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id: campaignId } = await context.params;
    return runBatchBriefGeneration(campaignId);
  });
}
