import { NextResponse } from "next/server";
import { runSignalOpsEngine } from "@/lib/sm/signalops-engine";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { SIGNALOPS_TM } from "@/lib/sm/ui";
import { resolveVisualResearch } from "@/lib/sm/visual-research";
import {
  getClient,
  getCreativeRequest,
  saveSignalOpsOutput,
  updateCreativeRequest,
} from "@/lib/sm/store";

export const runtime = "nodejs";
export const maxDuration = 300;

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
        // 1) Strategy first — full SignalOps output.
        const { output, must_include } = await runSignalOpsEngine(client, request);
        const saved = await saveSignalOpsOutput({
          request_id: id,
          ...output,
        });

        // Persist researched ingredients so image generation honors them.
        const nextRequest =
          must_include && must_include !== request.must_include
            ? { ...request, must_include }
            : request;

        await updateCreativeRequest(id, {
          status: "pending",
          ...(must_include && must_include !== request.must_include
            ? { must_include }
            : {}),
        });

        // 2) Visual research AFTER strategy, BEFORE image prompts.
        // Cached for generate/regenerate so prompts lock to strategy-aware refs.
        let visual_research: {
          categoryHint: string;
          styleBrief: string;
          referenceCount: number;
          queries: string[];
          fromCache: boolean;
        } | null = null;

        try {
          const research = await resolveVisualResearch({
            client,
            request: nextRequest,
            signalops: saved,
            forceRefresh: true,
          });
          visual_research = {
            categoryHint: research.categoryHint,
            styleBrief: research.styleBrief,
            referenceCount: research.referenceImageUrls.length,
            queries: research.queries,
            fromCache: research.fromCache,
          };
          console.info(
            `[signalops] visual-research done category=${research.categoryHint} ` +
              `refs=${research.referenceImageUrls.length} queries=${research.queries.length}`
          );
        } catch (researchError) {
          // Soft-fail: generate can still run research as fallback.
          console.warn("[signalops] visual-research soft-fail:", researchError);
        }

        return { ...saved, visual_research };
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
