import { NextResponse } from "next/server";
import { withBasePath } from "@/lib/base-path";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { logAuditEvent } from "@/lib/sm/audit";
import { enableRequestReview, getCreativeRequest } from "@/lib/sm/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  return smRouteHandler(_req, async () => {
    const { id } = await context.params;
    const request = await getCreativeRequest(id);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const updated = await enableRequestReview(id);
    if (!updated?.review_token) {
      return NextResponse.json({ error: "Failed to enable review" }, { status: 500 });
    }

    void logAuditEvent({
      entity_type: "request",
      entity_id: id,
      action: "review_enabled",
      metadata: { review_token: updated.review_token },
    });

    return {
      review_token: updated.review_token,
      review_url: withBasePath(`/review/${updated.review_token}`),
    };
  });
}
