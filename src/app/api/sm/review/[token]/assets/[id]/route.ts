import { NextResponse } from "next/server";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { logAuditEvent } from "@/lib/sm/audit";
import {
  getRequestReviewByToken,
  updateAssetApproval,
} from "@/lib/sm/store";
import type { SMAssetApprovalStatus } from "@/types/sm";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string; id: string }> };

const VALID_STATUSES = new Set<SMAssetApprovalStatus>([
  "approved",
  "rejected",
  "changes_requested",
  "pending",
]);

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { token, id: assetId } = await context.params;
    const review = await getRequestReviewByToken(token);
    if (!review) {
      return NextResponse.json({ error: "Review link not found or disabled" }, { status: 404 });
    }

    const asset = review.assets.find((a) => a.id === assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found in this review" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const approval_status = body.approval_status as SMAssetApprovalStatus | undefined;
    const client_comment =
      typeof body.client_comment === "string" ? body.client_comment.trim() : undefined;
    const approved_by =
      typeof body.approved_by === "string" ? body.approved_by.trim() : "client";

    if (approval_status && !VALID_STATUSES.has(approval_status)) {
      return NextResponse.json({ error: "Invalid approval_status" }, { status: 400 });
    }

    const patch: {
      approval_status: SMAssetApprovalStatus;
      approved_by?: string;
      client_comment?: string;
    } = {
      approval_status: approval_status ?? asset.approval_status ?? "pending",
    };
    if (client_comment !== undefined) patch.client_comment = client_comment;
    if (approval_status) patch.approved_by = approved_by;

    const updated = await updateAssetApproval(assetId, patch);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
    }

    void logAuditEvent({
      entity_type: "asset",
      entity_id: assetId,
      action: approval_status ? `approval_${approval_status}` : "comment",
      actor: approved_by,
      metadata: { client_comment, request_id: review.request.id },
    });

    return updated;
  });
}
