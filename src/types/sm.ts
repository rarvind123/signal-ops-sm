export type SMTone =
  | "bold"
  | "warm"
  | "premium"
  | "playful"
  | "professional"
  | "urgent";

export type SMPlatform =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "twitter"
  | "youtube";

export type SMGoal =
  | "offer"
  | "launch"
  | "awareness"
  | "event"
  | "cta"
  | "testimonial";

export type SMAssetType = "post" | "story" | "reel_cover" | "banner";

export type SMCreativeFormat =
  | "social_media"
  | "print_ad"
  | "outdoor"
  | "tv_script"
  | "social_video"
  | "pitch_deck";

export type SMCreativeLens =
  | "signalops"
  | "human_truth"
  | "brave_take"
  | "category_breaker"
  | "cultural_insider"
  | "behaviour_change"
  | "craft_first";

export interface SMClient {
  id: string;
  name: string;
  tagline?: string;
  usp?: string;
  target_audience: {
    age?: string;
    gender?: string;
    interests?: string[];
    location?: string;
  };
  tone?: SMTone;
  brand_colors: Array<{ hex: string; label: string }>;
  social_handles: Partial<Record<SMPlatform, string>>;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SMBrandAsset {
  id: string;
  client_id: string;
  type: "logo" | "image" | "video";
  storage_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SMCreativeRequest {
  id: string;
  client_id: string;
  brief_text: string;
  platforms: SMPlatform[];
  goal?: SMGoal;
  uploaded_image_urls: string[];
  creative_format?: SMCreativeFormat;
  creative_lens?: SMCreativeLens;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

export interface SMSignalOpsHeadline {
  text: string;
  setup?: string;
  punch?: string;
  emphasis_word?: string;
  rationale: string;
  be_trigger: string;
}

export interface SMInsightBridge {
  human_truth: string;
  brand_truth: string;
  creative_tension: string;
}

export interface SMBeTrigger {
  primary: string;
  label: string;
  rationale: string;
  application: string;
}

export interface SMCulturalResonance {
  target_pillar: string;
  rationale: string;
  sensitivity_flags: string[];
}

export interface SMLionsScore {
  distinct: number;
  truthful: number;
  brave: number;
  crafted: number;
  overall: number;
  improvement_note: string;
}

export type SMVisualApproachMode =
  | "concept_first"
  | "product_transformed"
  | "product_hero"
  | "effects_visible"
  | "visual_tension";

export interface SMVisualApproach {
  mode: SMVisualApproachMode;
  rationale: string;
  obvious_ideas_rejected: string[];
  scene_description: string;
  product_visible: boolean;
  brave_score: number;
}

export interface SMSignalOpsOutput {
  id: string;
  request_id: string;
  theme: string;
  visual_direction: string;
  visual_approach: SMVisualApproach;
  headlines: SMSignalOpsHeadline[];
  color_recommendation: string;
  creative_notes: string;
  platform_adaptations: Partial<Record<SMPlatform, string>>;
  insight_bridge: SMInsightBridge;
  be_trigger: SMBeTrigger;
  cultural_resonance: SMCulturalResonance;
  lions_score: SMLionsScore;
  created_at: string;
}

export interface SMGeneratedAsset {
  id: string;
  request_id: string;
  signalops_id?: string;
  asset_type: SMAssetType;
  platform: SMPlatform;
  storage_url?: string;
  copy?: string;
  headline?: string;
  cta?: string;
  generation_prompt?: string;
  status: "pending" | "generating" | "done" | "failed";
  error_message?: string;
  created_at: string;
}

export interface SMAssetVersion {
  id: string;
  asset_id: string;
  storage_url: string;
  version_number: number;
  created_at: string;
}

export interface SMSocialAccount {
  id: string;
  client_id: string;
  platform: SMPlatform;
  access_token: string;
  account_id: string;
  username?: string;
  connected_at: string;
}

export interface SMPublishJob {
  id: string;
  asset_id: string;
  social_account_id: string;
  status: "queued" | "published" | "failed";
  scheduled_at?: string;
  published_at?: string;
  platform_post_id?: string;
  error_message?: string;
  created_at: string;
}

export type SMCampaignObjective =
  | "awareness"
  | "engagement"
  | "conversion"
  | "launch"
  | "retention"
  | "event";

export type SMContentFormat =
  | "static"
  | "carousel"
  | "reel"
  | "reel_comic"
  | "meme"
  | "testimonial"
  | "offer";

export type SMCampaignStatus =
  | "drafting"
  | "strategy_ready"
  | "calendar_ready"
  | "executing"
  | "complete";

export interface SMCampaign {
  id: string;
  client_id: string;
  name: string;
  objective?: SMCampaignObjective;
  duration_days: number;
  product_service?: string;
  key_message?: string;
  offer?: string;
  target_audience: Record<string, unknown>;
  platforms: SMPlatform[];
  mandatory_ctas: string[];
  additional_notes?: string;
  status: SMCampaignStatus;
  created_at: string;
  updated_at?: string;
}

export interface SMContentPillar {
  name: string;
  description: string;
  percentage: number;
  post_types: SMContentFormat[];
}

export interface SMStoryArcPhase {
  phase: string;
  week_range: string;
  description: string;
  emotional_tone: string;
}

export interface SMCampaignStrategy {
  id: string;
  campaign_id: string;
  narrative_theme: string;
  campaign_tagline: string;
  story_arc: SMStoryArcPhase[];
  content_pillars: SMContentPillar[];
  content_mix: Partial<Record<SMContentFormat, number>>;
  strategic_notes: string;
  platform_notes: Partial<Record<SMPlatform, string>>;
  created_at: string;
}

export interface SMCampaignCalendarItem {
  id: string;
  campaign_id: string;
  strategy_id?: string;
  post_number: number;
  week_number: number;
  format: SMContentFormat;
  pillar?: string;
  story_phase?: string;
  strategic_purpose?: string;
  suggested_date?: string;
  status: "brief_pending" | "brief_ready" | "generating" | "done";
  created_at: string;
}

export interface SMBriefSlide {
  slide?: number;
  element?: string;
  label?: string;
  content: string;
}

export interface SMCreativeBrief {
  id: string;
  calendar_item_id: string;
  campaign_id: string;
  post_number: number;
  format: SMContentFormat;
  pillar?: string;
  objective: string;
  hook: string;
  structure: SMBriefSlide[];
  creative_direction: string;
  caption_direction: string;
  cta: string;
  hashtag_suggestions: string[];
  visual_approach_mode?: SMVisualApproachMode;
  scene_description?: string;
  status: "pending" | "generating" | "done";
  generated_asset_id?: string;
  created_at: string;
}
