import { smRouteHandler } from "@/lib/sm/api-auth";
import { patchCreativeBriefFields } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const allowed = ["hook", "scene_description", "cta", "caption_direction"] as const;
    const patch = Object.fromEntries(
      Object.entries(body).filter(([key]) =>
        (allowed as readonly string[]).includes(key)
      )
    );
    await patchCreativeBriefFields(id, patch);
    return { ok: true };
  });
}
