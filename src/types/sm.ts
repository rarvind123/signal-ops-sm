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
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

export interface SMSignalOpsHeadline {
  text: string;
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

export interface SMSignalOpsOutput {
  id: string;
  request_id: string;
  theme: string;
  visual_direction: string;
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
