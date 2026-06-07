import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { smRouteHandler } from "@/lib/sm/api-auth";
import { getClient, getCreativeRequest, getSignalOpsOutput } from "@/lib/sm/store";
import type { SMVisualApproachMode } from "@/types/sm";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const MODE_DESCRIPTIONS: Record<SMVisualApproachMode, string> = {
  concept_first:
    "No product. A metaphorical scene proves the brand truth. Product completely absent. The viewer earns the brand connection themselves.",
  product_transformed:
    "Product appears but impossibly reimagined — in an unexpected, conceptual, or surrealist way.",
  product_hero:
    "Product is the dramatic primary subject. Environment serves the product. High-end commercial photography.",
  effects_visible:
    "Product completely absent. Show its emotional or physical effect on a person or the world.",
  visual_tension:
    "Two incompatible or contradictory things forced together. Creates cognitive dissonance resolved by the brand. No product needed.",
};

const VALID_MODES = Object.keys(MODE_DESCRIPTIONS) as SMVisualApproachMode[];

export async function POST(req: Request, context: RouteContext) {
  return smRouteHandler(req, async () => {
    const { id: requestId } = await context.params;
    const body = await req.json();
    const mode = body.mode as SMVisualApproachMode;

    if (!mode || !VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid visual approach mode" }, { status: 400 });
    }

    const [request, signalops] = await Promise.all([
      getCreativeRequest(requestId),
      getSignalOpsOutput(requestId),
    ]);

    if (!request || !signalops) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const client = await getClient(request.client_id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const modeLabel = mode.replace(/_/g, " ").toUpperCase();

    const prompt = `You are a senior art director generating a scene description for a specific visual execution mode.

BRAND: ${client.name}
BRAND TONE: ${client.tone ?? "professional"}
CAMPAIGN THEME: ${signalops.theme}
CREATIVE TENSION: ${signalops.insight_bridge?.creative_tension ?? ""}

CHOSEN VISUAL MODE: ${modeLabel}
MODE DESCRIPTION: ${MODE_DESCRIPTIONS[mode]}

MANDATORY CONSTRAINTS:
${request.must_exclude ? `- FORBIDDEN: ${request.must_exclude}` : "- No hands as primary subject"}
${request.must_include ? `- MUST INCLUDE: ${request.must_include}` : ""}
- Absolutely no text, numbers, logos, or watermarks in the image
- ONE primary subject only (maximum economy rule)

Generate a single, specific, FLUX-renderable scene description for this mode.
The description must:
- Name the exact primary subject (one noun)
- Describe its position, lighting, and background
- Be specific enough to brief a photographer
- Reject any scene featuring hands as the primary subject

Return ONLY the scene description as plain text. No explanation. No preamble.`;

    const scene_description = await callAI({
      system: "You are a visual art director. Return only the scene description, nothing else.",
      user: prompt,
      maxTokens: 400,
      temperature: 0.8,
    });

    return { scene_description: scene_description.trim(), mode };
  });
}
