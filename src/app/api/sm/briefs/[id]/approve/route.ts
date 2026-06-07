import { smRouteHandler } from "@/lib/sm/api-auth";
import { patchCreativeBriefFields } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = (await req.json()) as { approved?: boolean };
    await patchCreativeBriefFields(id, { approved: Boolean(body.approved) });
    return { ok: true };
  });
}
