-- SM Client Profiles
CREATE TABLE sm_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  tagline         TEXT,
  usp             TEXT,
  target_audience JSONB DEFAULT '{}',
  tone            TEXT,
  brand_colors    JSONB DEFAULT '[]',
  social_handles  JSONB DEFAULT '{}',
  logo_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Brand Assets
CREATE TABLE sm_brand_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES sm_clients(id) ON DELETE CASCADE,
  type        TEXT CHECK (type IN ('logo', 'image', 'video')),
  storage_url TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Creative Requests
CREATE TABLE sm_creative_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID REFERENCES sm_clients(id) ON DELETE CASCADE,
  brief_text           TEXT NOT NULL,
  platforms            JSONB DEFAULT '[]',
  goal                 TEXT,
  uploaded_image_urls  JSONB DEFAULT '[]',
  creative_lens        TEXT DEFAULT 'signalops',
  creative_format      TEXT DEFAULT 'social_media',
  status               TEXT DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- SignalOps Outputs
CREATE TABLE sm_signalops_outputs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID REFERENCES sm_creative_requests(id) ON DELETE CASCADE,
  theme                TEXT,
  visual_direction     TEXT,
  headlines            JSONB DEFAULT '[]',
  creative_notes       TEXT,
  color_recommendation TEXT,
  platform_adaptations JSONB DEFAULT '{}',
  insight_bridge       JSONB DEFAULT '{}',
  be_trigger           JSONB DEFAULT '{}',
  cultural_resonance   JSONB DEFAULT '{}',
  lions_score          JSONB DEFAULT '{}',
  visual_approach      JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Assets
CREATE TABLE sm_generated_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID REFERENCES sm_creative_requests(id) ON DELETE CASCADE,
  signalops_id        UUID REFERENCES sm_signalops_outputs(id),
  asset_type          TEXT CHECK (asset_type IN ('post', 'story', 'reel_cover', 'banner')),
  platform            TEXT,
  storage_url         TEXT,
  copy                TEXT,
  headline            TEXT,
  cta                 TEXT,
  generation_prompt   TEXT,
  status              TEXT DEFAULT 'pending',
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Versions
CREATE TABLE sm_asset_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID REFERENCES sm_generated_assets(id) ON DELETE CASCADE,
  storage_url    TEXT NOT NULL,
  version_number INT DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Social Accounts
CREATE TABLE sm_social_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID REFERENCES sm_clients(id) ON DELETE CASCADE,
  platform     TEXT,
  access_token TEXT,
  account_id   TEXT,
  username     TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publish Jobs
CREATE TABLE sm_publish_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID REFERENCES sm_generated_assets(id),
  social_account_id UUID REFERENCES sm_social_accounts(id),
  status            TEXT DEFAULT 'queued',
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  platform_post_id  TEXT,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sm_creative_requests_client ON sm_creative_requests(client_id);
CREATE INDEX idx_sm_generated_assets_request ON sm_generated_assets(request_id);
CREATE INDEX idx_sm_signalops_request ON sm_signalops_outputs(request_id);

-- Existing deployments: add creative_lens if table already exists
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS creative_lens TEXT DEFAULT 'signalops';
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS creative_format TEXT DEFAULT 'social_media';
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS visual_approach JSONB DEFAULT '{}';

-- Campaign orchestration
CREATE TABLE IF NOT EXISTS sm_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID REFERENCES sm_clients(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  objective        TEXT CHECK (objective IN ('awareness','engagement','conversion','launch','retention','event')),
  duration_days    INT DEFAULT 30,
  product_service  TEXT,
  key_message      TEXT,
  offer            TEXT,
  target_audience  JSONB DEFAULT '{}',
  platforms        JSONB DEFAULT '[]',
  mandatory_ctas   JSONB DEFAULT '[]',
  additional_notes TEXT,
  review_token     TEXT UNIQUE,
  review_enabled   BOOLEAN DEFAULT FALSE,
  status           TEXT DEFAULT 'drafting',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sm_campaign_strategies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID REFERENCES sm_campaigns(id) ON DELETE CASCADE,
  narrative_theme  TEXT,
  campaign_tagline TEXT,
  story_arc        JSONB DEFAULT '[]',
  content_pillars  JSONB DEFAULT '[]',
  content_mix      JSONB DEFAULT '{}',
  strategic_notes  TEXT,
  platform_notes   JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sm_campaign_calendar (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID REFERENCES sm_campaigns(id) ON DELETE CASCADE,
  strategy_id       UUID REFERENCES sm_campaign_strategies(id),
  post_number       INT NOT NULL,
  week_number       INT NOT NULL,
  format            TEXT NOT NULL,
  pillar            TEXT,
  story_phase       TEXT,
  strategic_purpose TEXT,
  suggested_date    DATE,
  status            TEXT DEFAULT 'brief_pending',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sm_creative_briefs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_item_id    UUID REFERENCES sm_campaign_calendar(id) ON DELETE CASCADE,
  campaign_id         UUID REFERENCES sm_campaigns(id),
  post_number         INT,
  format              TEXT,
  pillar              TEXT,
  objective           TEXT,
  hook                TEXT,
  structure           JSONB DEFAULT '[]',
  creative_direction  TEXT,
  caption_direction   TEXT,
  cta                 TEXT,
  hashtag_suggestions JSONB DEFAULT '[]',
  visual_approach_mode TEXT,
  scene_description   TEXT,
  status              TEXT DEFAULT 'pending',
  generated_asset_id  UUID REFERENCES sm_generated_assets(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sm_campaigns_client ON sm_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_sm_calendar_campaign ON sm_campaign_calendar(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sm_briefs_campaign ON sm_creative_briefs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sm_briefs_calendar ON sm_creative_briefs(calendar_item_id);
