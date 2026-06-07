import { NextResponse } from "next/server";
import { runSignalOpsEngine } from "@/lib/sm/signalops-engine";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { SIGNALOPS_TM } from "@/lib/sm/ui";
import {
  getClient,
  getCreativeRequest,
  saveSignalOpsOutput,
  updateCreativeRequest,
} from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return await smRouteHandler(req, async () => {
      const request = await getCreativeRequest(id);
      if (!request) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      const client = await getClient(request.client_id);
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      await updateCreativeRequest(id, { status: "processing" });

      try {
        const output = await runSignalOpsEngine(client, request);
        const saved = await saveSignalOpsOutput({
          request_id: id,
          ...output,
        });
        await updateCreativeRequest(id, { status: "pending" });
        return saved;
      } catch (e) {
        await updateCreativeRequest(id, { status: "failed" });
        throw e;
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : `${SIGNALOPS_TM} failed`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
