import "server-only";

import { normalizeCampaignStrategyOutput } from "@/lib/sm/campaign-strategy-utils";
import { supabase } from "@/lib/supabase";
import type {
  SMAssetVersion,
  SMBrandAsset,
  SMClient,
  SMCampaign,
  SMCampaignCalendarItem,
  SMCampaignStrategy,
  SMCreativeBrief,
  SMCreativeRequest,
  SMGeneratedAsset,
  SMPublishJob,
  SMSignalOpsOutput,
  SMVisualApproach,
  SMSocialAccount,
} from "@/types/sm";

const DEFAULT_VISUAL_APPROACH: SMVisualApproach = {
  mode: "concept_first",
  rationale: "",
  obvious_ideas_rejected: [],
  scene_description: "",
  product_visible: false,
  brave_score: 5,
};

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function mapClient(row: Record<string, unknown>): SMClient {
  return {
    id: String(row.id),
    name: String(row.name),
    tagline: row.tagline ? String(row.tagline) : undefined,
    usp: row.usp ? String(row.usp) : undefined,
    target_audience: (row.target_audience as SMClient["target_audience"]) ?? {},
    tone: row.tone as SMClient["tone"],
    brand_colors: (row.brand_colors as SMClient["brand_colors"]) ?? [],
    social_handles: (row.social_handles as SMClient["social_handles"]) ?? {},
    logo_url: row.logo_url ? String(row.logo_url) : undefined,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

function mapBrandAsset(row: Record<string, unknown>): SMBrandAsset {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    type: row.type as SMBrandAsset["type"],
    storage_url: String(row.storage_url),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: String(row.created_at),
  };
}

function mapCreativeRequest(row: Record<string, unknown>): SMCreativeRequest {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    brief_text: String(row.brief_text),
    platforms: (row.platforms as SMCreativeRequest["platforms"]) ?? [],
    goal: row.goal as SMCreativeRequest["goal"],
    uploaded_image_urls: (row.uploaded_image_urls as string[]) ?? [],
    creative_format:
      (row.creative_format as SMCreativeRequest["creative_format"]) ?? "social_media",
    creative_lens: (row.creative_lens as SMCreativeRequest["creative_lens"]) ?? "signalops",
    status: row.status as SMCreativeRequest["status"],
    created_at: String(row.created_at),
  };
}

function mapSignalOpsOutput(row: Record<string, unknown>): SMSignalOpsOutput {
  return {
    id: String(row.id),
    request_id: String(row.request_id),
    theme: String(row.theme ?? ""),
    visual_direction: String(row.visual_direction ?? ""),
    headlines: (row.headlines as SMSignalOpsOutput["headlines"]) ?? [],
    color_recommendation: String(row.color_recommendation ?? ""),
    creative_notes: String(row.creative_notes ?? ""),
    platform_adaptations:
      (row.platform_adaptations as SMSignalOpsOutput["platform_adaptations"]) ?? {},
    insight_bridge: (row.insight_bridge as SMSignalOpsOutput["insight_bridge"]) ?? {
      human_truth: "",
      brand_truth: "",
      creative_tension: "",
    },
    be_trigger: (row.be_trigger as SMSignalOpsOutput["be_trigger"]) ?? {
      primary: "",
      label: "",
      rationale: "",
      application: "",
    },
    cultural_resonance: (row.cultural_resonance as SMSignalOpsOutput["cultural_resonance"]) ?? {
      target_pillar: "recognition",
      rationale: "",
      sensitivity_flags: [],
    },
    lions_score: (row.lions_score as SMSignalOpsOutput["lions_score"]) ?? {
      distinct: 0,
      truthful: 0,
      brave: 0,
      crafted: 0,
      overall: 0,
      improvement_note: "",
    },
    visual_approach: (row.visual_approach as SMVisualApproach) ?? DEFAULT_VISUAL_APPROACH,
    created_at: String(row.created_at),
  };
}

function mapGeneratedAsset(row: Record<string, unknown>): SMGeneratedAsset {
  return {
    id: String(row.id),
    request_id: String(row.request_id),
    signalops_id: row.signalops_id ? String(row.signalops_id) : undefined,
    asset_type: row.asset_type as SMGeneratedAsset["asset_type"],
    platform: row.platform as SMGeneratedAsset["platform"],
    storage_url: row.storage_url ? String(row.storage_url) : undefined,
    copy: row.copy ? String(row.copy) : undefined,
    headline: row.headline ? String(row.headline) : undefined,
    cta: row.cta ? String(row.cta) : undefined,
    generation_prompt: row.generation_prompt ? String(row.generation_prompt) : undefined,
    status: row.status as SMGeneratedAsset["status"],
    error_message: row.error_message ? String(row.error_message) : undefined,
    created_at: String(row.created_at),
  };
}

function mapAssetVersion(row: Record<string, unknown>): SMAssetVersion {
  return {
    id: String(row.id),
    asset_id: String(row.asset_id),
    storage_url: String(row.storage_url),
    version_number: Number(row.version_number ?? 1),
    created_at: String(row.created_at),
  };
}

function mapSocialAccount(row: Record<string, unknown>): SMSocialAccount {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    platform: row.platform as SMSocialAccount["platform"],
    access_token: String(row.access_token ?? ""),
    account_id: String(row.account_id ?? ""),
    username: row.username ? String(row.username) : undefined,
    connected_at: String(row.connected_at),
  };
}

function mapCampaign(row: Record<string, unknown>): SMCampaign {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    name: String(row.name),
    objective: row.objective as SMCampaign["objective"],
    duration_days: Number(row.duration_days ?? 30),
    product_service: row.product_service ? String(row.product_service) : undefined,
    key_message: row.key_message ? String(row.key_message) : undefined,
    offer: row.offer ? String(row.offer) : undefined,
    target_audience: (row.target_audience as Record<string, unknown>) ?? {},
    platforms: (row.platforms as SMCampaign["platforms"]) ?? [],
    mandatory_ctas: (row.mandatory_ctas as string[]) ?? [],
    additional_notes: row.additional_notes ? String(row.additional_notes) : undefined,
    status: (row.status as SMCampaign["status"]) ?? "drafting",
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapCampaignStrategy(row: Record<string, unknown>): SMCampaignStrategy {
  const normalized = normalizeCampaignStrategyOutput({
    narrative_theme: String(row.narrative_theme ?? ""),
    campaign_tagline: String(row.campaign_tagline ?? ""),
    story_arc: (row.story_arc as SMCampaignStrategy["story_arc"]) ?? [],
    content_pillars: (row.content_pillars as SMCampaignStrategy["content_pillars"]) ?? [],
    content_mix: (row.content_mix as SMCampaignStrategy["content_mix"]) ?? {},
    strategic_notes: String(row.strategic_notes ?? ""),
    platform_notes: (row.platform_notes as SMCampaignStrategy["platform_notes"]) ?? {},
  });

  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    ...normalized,
    created_at: String(row.created_at),
  };
}

function mapCalendarItem(row: Record<string, unknown>): SMCampaignCalendarItem {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    strategy_id: row.strategy_id ? String(row.strategy_id) : undefined,
    post_number: Number(row.post_number),
    week_number: Number(row.week_number),
    format: row.format as SMCampaignCalendarItem["format"],
    pillar: row.pillar ? String(row.pillar) : undefined,
    story_phase: row.story_phase ? String(row.story_phase) : undefined,
    strategic_purpose: row.strategic_purpose ? String(row.strategic_purpose) : undefined,
    suggested_date: row.suggested_date ? String(row.suggested_date) : undefined,
    status: (row.status as SMCampaignCalendarItem["status"]) ?? "brief_pending",
    created_at: String(row.created_at),
  };
}

function mapCreativeBrief(row: Record<string, unknown>): SMCreativeBrief {
  return {
    id: String(row.id),
    calendar_item_id: String(row.calendar_item_id),
    campaign_id: String(row.campaign_id),
    post_number: Number(row.post_number ?? 0),
    format: row.format as SMCreativeBrief["format"],
    pillar: row.pillar ? String(row.pillar) : undefined,
    objective: String(row.objective ?? ""),
    hook: String(row.hook ?? ""),
    structure: (row.structure as SMCreativeBrief["structure"]) ?? [],
    creative_direction: String(row.creative_direction ?? ""),
    caption_direction: String(row.caption_direction ?? ""),
    cta: String(row.cta ?? ""),
    hashtag_suggestions: (row.hashtag_suggestions as string[]) ?? [],
    visual_approach_mode: row.visual_approach_mode as SMCreativeBrief["visual_approach_mode"],
    scene_description: row.scene_description ? String(row.scene_description) : undefined,
    status: (row.status as SMCreativeBrief["status"]) ?? "pending",
    generated_asset_id: row.generated_asset_id ? String(row.generated_asset_id) : undefined,
    created_at: String(row.created_at),
  };
}

function mapPublishJob(row: Record<string, unknown>): SMPublishJob {
  return {
    id: String(row.id),
    asset_id: String(row.asset_id),
    social_account_id: String(row.social_account_id),
    status: row.status as SMPublishJob["status"],
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : undefined,
    published_at: row.published_at ? String(row.published_at) : undefined,
    platform_post_id: row.platform_post_id ? String(row.platform_post_id) : undefined,
    error_message: row.error_message ? String(row.error_message) : undefined,
    created_at: String(row.created_at),
  };
}

export async function listClients(): Promise<SMClient[]> {
  const { data, error } = await supabase
    .from("sm_clients")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => mapClient(row as Record<string, unknown>));
}

export async function getClient(id: string): Promise<SMClient | null> {
  const { data, error } = await supabase.from("sm_clients").select("*").eq("id", id).maybeSingle();
  throwIfError(error);
  return data ? mapClient(data as Record<string, unknown>) : null;
}

export async function createClient(
  input: Omit<SMClient, "id" | "created_at" | "updated_at">
): Promise<SMClient> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sm_clients")
    .insert({
      name: input.name,
      tagline: input.tagline ?? null,
      usp: input.usp ?? null,
      target_audience: input.target_audience ?? {},
      tone: input.tone ?? null,
      brand_colors: input.brand_colors ?? [],
      social_handles: input.social_handles ?? {},
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapClient(data as Record<string, unknown>);
}

export async function updateClient(
  id: string,
  patch: Partial<Omit<SMClient, "id" | "created_at">>
): Promise<SMClient | null> {
  const { data, error } = await supabase
    .from("sm_clients")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data ? mapClient(data as Record<string, unknown>) : null;
}

export async function deleteClient(id: string): Promise<boolean> {
  const existing = await getClient(id);
  if (!existing) return false;
  const { error } = await supabase.from("sm_clients").delete().eq("id", id);
  throwIfError(error);
  return true;
}

export async function getClientLogoUrl(clientId: string): Promise<string | null> {
  const client = await getClient(clientId);
  if (client?.logo_url) return client.logo_url;

  const { data, error } = await supabase
    .from("sm_brand_assets")
    .select("storage_url")
    .eq("client_id", clientId)
    .eq("type", "logo")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data?.storage_url ? String(data.storage_url) : null;
}

export async function listBrandAssets(clientId: string): Promise<SMBrandAsset[]> {
  const { data, error } = await supabase
    .from("sm_brand_assets")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => mapBrandAsset(row as Record<string, unknown>));
}

export async function createBrandAsset(
  input: Omit<SMBrandAsset, "id" | "created_at">
): Promise<SMBrandAsset> {
  const { data, error } = await supabase
    .from("sm_brand_assets")
    .insert({
      client_id: input.client_id,
      type: input.type,
      storage_url: input.storage_url,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapBrandAsset(data as Record<string, unknown>);
}

export async function createCreativeRequest(
  input: Omit<SMCreativeRequest, "id" | "status" | "created_at">
): Promise<SMCreativeRequest> {
  const { data, error } = await supabase
    .from("sm_creative_requests")
    .insert({
      client_id: input.client_id,
      brief_text: input.brief_text,
      platforms: input.platforms ?? [],
      goal: input.goal ?? null,
      uploaded_image_urls: input.uploaded_image_urls ?? [],
      creative_format: input.creative_format ?? "social_media",
      creative_lens: input.creative_lens ?? "signalops",
      status: "pending",
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapCreativeRequest(data as Record<string, unknown>);
}

export async function getCreativeRequest(id: string): Promise<SMCreativeRequest | null> {
  const { data, error } = await supabase
    .from("sm_creative_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapCreativeRequest(data as Record<string, unknown>) : null;
}

export async function updateCreativeRequest(
  id: string,
  patch: Partial<Omit<SMCreativeRequest, "id" | "created_at">>
): Promise<SMCreativeRequest | null> {
  const { data, error } = await supabase
    .from("sm_creative_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data ? mapCreativeRequest(data as Record<string, unknown>) : null;
}

export async function getSignalOpsOutput(
  requestId: string
): Promise<SMSignalOpsOutput | null> {
  const { data, error } = await supabase
    .from("sm_signalops_outputs")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data ? mapSignalOpsOutput(data as Record<string, unknown>) : null;
}

export async function saveSignalOpsOutput(
  input: Omit<SMSignalOpsOutput, "id" | "created_at">
): Promise<SMSignalOpsOutput> {
  const { data, error } = await supabase
    .from("sm_signalops_outputs")
    .insert({
      request_id: input.request_id,
      theme: input.theme,
      visual_direction: input.visual_direction,
      headlines: input.headlines ?? [],
      color_recommendation: input.color_recommendation,
      creative_notes: input.creative_notes,
      platform_adaptations: input.platform_adaptations ?? {},
      insight_bridge: input.insight_bridge,
      be_trigger: input.be_trigger,
      cultural_resonance: input.cultural_resonance,
      lions_score: input.lions_score,
      visual_approach: input.visual_approach ?? DEFAULT_VISUAL_APPROACH,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapSignalOpsOutput(data as Record<string, unknown>);
}

export async function listGeneratedAssets(
  requestId: string
): Promise<SMGeneratedAsset[]> {
  const { data, error } = await supabase
    .from("sm_generated_assets")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  throwIfError(error);
  return (data ?? []).map((row) => mapGeneratedAsset(row as Record<string, unknown>));
}

export async function getGeneratedAsset(id: string): Promise<SMGeneratedAsset | null> {
  const { data, error } = await supabase
    .from("sm_generated_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapGeneratedAsset(data as Record<string, unknown>) : null;
}

export async function createGeneratedAsset(
  input: Omit<SMGeneratedAsset, "id" | "created_at" | "status"> & {
    status?: SMGeneratedAsset["status"];
  }
): Promise<SMGeneratedAsset> {
  const { data, error } = await supabase
    .from("sm_generated_assets")
    .insert({
      request_id: input.request_id,
      signalops_id: input.signalops_id ?? null,
      asset_type: input.asset_type,
      platform: input.platform,
      storage_url: input.storage_url ?? null,
      copy: input.copy ?? null,
      headline: input.headline ?? null,
      cta: input.cta ?? null,
      generation_prompt: input.generation_prompt ?? null,
      status: input.status ?? "pending",
      error_message: input.error_message ?? null,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapGeneratedAsset(data as Record<string, unknown>);
}

export async function updateGeneratedAsset(
  id: string,
  patch: Partial<Omit<SMGeneratedAsset, "id" | "created_at">>
): Promise<SMGeneratedAsset | null> {
  const { data, error } = await supabase
    .from("sm_generated_assets")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data ? mapGeneratedAsset(data as Record<string, unknown>) : null;
}

export async function createAssetVersion(
  input: Omit<SMAssetVersion, "id" | "created_at">
): Promise<SMAssetVersion> {
  const { data, error } = await supabase
    .from("sm_asset_versions")
    .insert({
      asset_id: input.asset_id,
      storage_url: input.storage_url,
      version_number: input.version_number,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapAssetVersion(data as Record<string, unknown>);
}

export async function listSocialAccounts(clientId: string): Promise<SMSocialAccount[]> {
  const { data, error } = await supabase
    .from("sm_social_accounts")
    .select("*")
    .eq("client_id", clientId);
  throwIfError(error);
  return (data ?? []).map((row) => mapSocialAccount(row as Record<string, unknown>));
}

export async function getSocialAccount(id: string): Promise<SMSocialAccount | null> {
  const { data, error } = await supabase
    .from("sm_social_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapSocialAccount(data as Record<string, unknown>) : null;
}

export async function createPublishJob(
  input: Omit<SMPublishJob, "id" | "created_at" | "status"> & {
    status?: SMPublishJob["status"];
  }
): Promise<SMPublishJob> {
  const { data, error } = await supabase
    .from("sm_publish_jobs")
    .insert({
      asset_id: input.asset_id,
      social_account_id: input.social_account_id,
      status: input.status ?? "queued",
      scheduled_at: input.scheduled_at ?? null,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapPublishJob(data as Record<string, unknown>);
}

export async function updatePublishJob(
  id: string,
  patch: Partial<Omit<SMPublishJob, "id" | "created_at">>
): Promise<SMPublishJob | null> {
  const { data, error } = await supabase
    .from("sm_publish_jobs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data ? mapPublishJob(data as Record<string, unknown>) : null;
}

export async function getCreativeRequestBundle(id: string) {
  const request = await getCreativeRequest(id);
  if (!request) return null;
  const [signalops, assets, client] = await Promise.all([
    getSignalOpsOutput(id),
    listGeneratedAssets(id),
    getClient(request.client_id),
  ]);
  return { request, signalops, assets, client };
}

export async function createCampaign(
  data: Omit<SMCampaign, "id" | "status" | "created_at" | "updated_at">
): Promise<SMCampaign> {
  const now = new Date().toISOString();
  const { data: row, error } = await supabase
    .from("sm_campaigns")
    .insert({
      client_id: data.client_id,
      name: data.name,
      objective: data.objective ?? null,
      duration_days: data.duration_days ?? 30,
      product_service: data.product_service ?? null,
      key_message: data.key_message ?? null,
      offer: data.offer ?? null,
      target_audience: data.target_audience ?? {},
      platforms: data.platforms ?? [],
      mandatory_ctas: data.mandatory_ctas ?? [],
      additional_notes: data.additional_notes ?? null,
      status: "drafting",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapCampaign(row as Record<string, unknown>);
}

export async function getCampaign(id: string): Promise<SMCampaign | null> {
  const { data, error } = await supabase
    .from("sm_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapCampaign(data as Record<string, unknown>) : null;
}

export async function listCampaigns(clientId: string): Promise<SMCampaign[]> {
  const { data, error } = await supabase
    .from("sm_campaigns")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return (data ?? []).map((row) => mapCampaign(row as Record<string, unknown>));
}

export async function updateCampaign(
  id: string,
  patch: Partial<Omit<SMCampaign, "id" | "created_at">>
): Promise<SMCampaign | null> {
  const { data, error } = await supabase
    .from("sm_campaigns")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data ? mapCampaign(data as Record<string, unknown>) : null;
}

export async function saveCampaignStrategy(
  data: Omit<SMCampaignStrategy, "id" | "created_at">
): Promise<SMCampaignStrategy> {
  const { data: row, error } = await supabase
    .from("sm_campaign_strategies")
    .insert({
      campaign_id: data.campaign_id,
      narrative_theme: data.narrative_theme,
      campaign_tagline: data.campaign_tagline,
      story_arc: data.story_arc ?? [],
      content_pillars: data.content_pillars ?? [],
      content_mix: data.content_mix ?? {},
      strategic_notes: data.strategic_notes,
      platform_notes: data.platform_notes ?? {},
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapCampaignStrategy(row as Record<string, unknown>);
}

export async function getCampaignStrategy(
  campaignId: string
): Promise<SMCampaignStrategy | null> {
  const { data, error } = await supabase
    .from("sm_campaign_strategies")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  throwIfError(error);
  const rows = data ?? [];
  if (rows.length === 0) return null;

  const withContent = rows.find((row) => {
    const theme = (row as Record<string, unknown>).narrative_theme;
    return typeof theme === "string" && theme.trim().length > 0;
  });

  return mapCampaignStrategy(
    (withContent ?? rows[0]) as Record<string, unknown>
  );
}

export async function deleteCalendarItemsForCampaign(
  campaignId: string
): Promise<void> {
  const { error } = await supabase
    .from("sm_campaign_calendar")
    .delete()
    .eq("campaign_id", campaignId);
  throwIfError(error);
}

export async function bulkCreateCalendarItems(
  items: Omit<SMCampaignCalendarItem, "id" | "created_at">[]
): Promise<SMCampaignCalendarItem[]> {
  if (items.length === 0) return [];
  const { data, error } = await supabase
    .from("sm_campaign_calendar")
    .insert(
      items.map((item) => ({
        campaign_id: item.campaign_id,
        strategy_id: item.strategy_id ?? null,
        post_number: item.post_number,
        week_number: item.week_number,
        format: item.format,
        pillar: item.pillar ?? null,
        story_phase: item.story_phase ?? null,
        strategic_purpose: item.strategic_purpose ?? null,
        suggested_date: item.suggested_date ?? null,
        status: item.status ?? "brief_pending",
      }))
    )
    .select("*");
  throwIfError(error);
  return (data ?? []).map((row) => mapCalendarItem(row as Record<string, unknown>));
}

export async function getCalendarItems(
  campaignId: string
): Promise<SMCampaignCalendarItem[]> {
  const { data, error } = await supabase
    .from("sm_campaign_calendar")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("post_number", { ascending: true });
  throwIfError(error);
  return (data ?? []).map((row) => mapCalendarItem(row as Record<string, unknown>));
}

export async function saveCreativeBrief(
  data: Omit<SMCreativeBrief, "id" | "created_at">
): Promise<SMCreativeBrief> {
  const { data: row, error } = await supabase
    .from("sm_creative_briefs")
    .insert({
      calendar_item_id: data.calendar_item_id,
      campaign_id: data.campaign_id,
      post_number: data.post_number,
      format: data.format,
      pillar: data.pillar ?? null,
      objective: data.objective,
      hook: data.hook,
      structure: data.structure ?? [],
      creative_direction: data.creative_direction,
      caption_direction: data.caption_direction,
      cta: data.cta,
      hashtag_suggestions: data.hashtag_suggestions ?? [],
      visual_approach_mode: data.visual_approach_mode ?? null,
      scene_description: data.scene_description ?? null,
      status: data.status ?? "pending",
      generated_asset_id: data.generated_asset_id ?? null,
    })
    .select("*")
    .single();
  throwIfError(error);
  return mapCreativeBrief(row as Record<string, unknown>);
}

export async function updateCreativeBrief(
  id: string,
  data: Omit<SMCreativeBrief, "id" | "calendar_item_id" | "campaign_id" | "created_at">
): Promise<SMCreativeBrief> {
  const { data: row, error } = await supabase
    .from("sm_creative_briefs")
    .update({
      post_number: data.post_number,
      format: data.format,
      pillar: data.pillar ?? null,
      objective: data.objective,
      hook: data.hook,
      structure: data.structure ?? [],
      creative_direction: data.creative_direction,
      caption_direction: data.caption_direction,
      cta: data.cta,
      hashtag_suggestions: data.hashtag_suggestions ?? [],
      visual_approach_mode: data.visual_approach_mode ?? null,
      scene_description: data.scene_description ?? null,
      status: data.status ?? "pending",
      generated_asset_id: data.generated_asset_id ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  throwIfError(error);
  return mapCreativeBrief(row as Record<string, unknown>);
}

export async function getCreativeBrief(id: string): Promise<SMCreativeBrief | null> {
  const { data, error } = await supabase
    .from("sm_creative_briefs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error);
  return data ? mapCreativeBrief(data as Record<string, unknown>) : null;
}

export async function getCampaignBriefs(campaignId: string): Promise<SMCreativeBrief[]> {
  const { data, error } = await supabase
    .from("sm_creative_briefs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("post_number", { ascending: true });
  throwIfError(error);
  return (data ?? []).map((row) => mapCreativeBrief(row as Record<string, unknown>));
}

export async function updateBriefStatus(
  id: string,
  status: SMCreativeBrief["status"],
  assetId?: string
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (assetId) patch.generated_asset_id = assetId;
  const { error } = await supabase.from("sm_creative_briefs").update(patch).eq("id", id);
  throwIfError(error);
}

export async function updateCalendarItemStatus(
  id: string,
  status: SMCampaignCalendarItem["status"]
): Promise<void> {
  const { error } = await supabase.from("sm_campaign_calendar").update({ status }).eq("id", id);
  throwIfError(error);
}
