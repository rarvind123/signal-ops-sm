import "server-only";

import { completeText } from "@/lib/ai";
import type { SMClient, SMCreativeRequest, SMSignalOpsOutput } from "@/types/sm";

export async function generateTVScript(
  client: SMClient,
  signalops: SMSignalOpsOutput,
  request: SMCreativeRequest,
  headline?: string
): Promise<string> {
  const duration = "30";
  const spokenWords = duration === "30" ? "75" : "150";
  const chosenHeadline = headline ?? signalops.headlines[0]?.text ?? "";

  const prompt = `Write a ${duration}-second TV advertisement script for ${client.name}.

Brief: ${request.brief_text}

CREATIVE DIRECTION:
Theme: ${signalops.theme}
Visual Direction: ${signalops.visual_direction}
Human Truth: ${signalops.insight_bridge.human_truth}
Creative Tension: ${signalops.insight_bridge.creative_tension}
Headline: ${chosenHeadline}

FORMAT REQUIREMENTS:
- ${duration}-second script (~${spokenWords} spoken words)
- Format as: SCENE [number] | VISUAL: [description] | VO/DIALOGUE: [text] | SFX/MUSIC: [note]
- End with a brand endframe: Logo + tagline + endline
- Every scene must earn its airtime

Brand tone: ${client.tone ?? "professional"}
USP: ${client.usp ?? "not specified"}

Write the complete production-ready script:`;

  return completeText(
    "You are a senior TV copywriter. Write production-ready scripts that directors can take straight to set.",
    prompt
  );
}
