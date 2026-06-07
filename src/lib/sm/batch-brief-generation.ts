import "server-only";

import { generateCreativeBrief } from "@/lib/sm/creative-brief-engine";
import {
  getCalendarItems,
  getCampaign,
  getCampaignBriefs,
  getCampaignStrategy,
  getClient,
  saveCreativeBrief,
  updateCalendarItemStatus,
  updateCampaign,
  updateCreativeBrief,
} from "@/lib/sm/store";

export async function runBatchBriefGeneration(campaignId: string): Promise<{
  generated: number;
  total: number;
  errors: string[];
}> {
  const [campaign, strategy, calendarItems] = await Promise.all([
    getCampaign(campaignId),
    getCampaignStrategy(campaignId),
    getCalendarItems(campaignId),
  ]);

  if (!campaign || !strategy) {
    return { generated: 0, total: 0, errors: ["Campaign or strategy not found"] };
  }

  const client = await getClient(campaign.client_id);
  if (!client) {
    return { generated: 0, total: calendarItems.length, errors: ["Client not found"] };
  }

  const existingBriefs = await getCampaignBriefs(campaignId);
  const existingByCalendar = new Map(existingBriefs.map((b) => [b.calendar_item_id, b]));

  let generated = 0;
  const errors: string[] = [];

  for (const item of calendarItems) {
    const existing = existingByCalendar.get(item.id);
    if (existing?.scene_description?.trim()) {
      generated += 1;
      continue;
    }

    try {
      const briefData = await generateCreativeBrief(client, campaign, strategy, item);
      const payload = {
        post_number: briefData.post_number,
        format: briefData.format,
        pillar: briefData.pillar,
        objective: briefData.objective,
        hook: briefData.hook,
        structure: briefData.structure ?? [],
        creative_direction: briefData.creative_direction,
        caption_direction: briefData.caption_direction,
        cta: briefData.cta,
        hashtag_suggestions: briefData.hashtag_suggestions ?? [],
        visual_approach_mode: briefData.visual_approach_mode,
        scene_description: briefData.scene_description,
        status: "pending" as const,
      };

      if (existing) {
        await updateCreativeBrief(existing.id, payload);
      } else {
        await saveCreativeBrief({
          calendar_item_id: item.id,
          campaign_id: campaignId,
          ...payload,
        });
      }

      await updateCalendarItemStatus(item.id, "brief_ready");
      generated += 1;
    } catch (e) {
      errors.push(
        `Post #${item.post_number}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }

  await updateCampaign(campaignId, { status: "calendar_ready" });
  return { generated, total: calendarItems.length, errors };
}
