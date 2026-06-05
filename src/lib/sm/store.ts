import "server-only";

import { supabase } from "@/lib/supabase";
import type {
  SMAssetVersion,
  SMBrandAsset,
  SMClient,
  SMCreativeRequest,
  SMGeneratedAsset,
  SMPublishJob,
  SMSignalOpsOutput,
  SMSocialAccount,
} from "@/types/sm";

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
