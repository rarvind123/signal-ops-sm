-- =============================================================================
-- Run this entire file in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: all statements use IF NOT EXISTS
-- =============================================================================

-- Campaign client review link
ALTER TABLE sm_campaigns
  ADD COLUMN IF NOT EXISTS review_token TEXT,
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS sm_campaigns_review_token_key
  ON sm_campaigns (review_token)
  WHERE review_token IS NOT NULL;

-- Brief approval (client review flow)
ALTER TABLE sm_creative_briefs
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_comment TEXT;

-- Visual constraints on briefs
ALTER TABLE sm_creative_requests
  ADD COLUMN IF NOT EXISTS must_include TEXT,
  ADD COLUMN IF NOT EXISTS must_exclude TEXT;

-- Layout templates + Meta market context
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS layout_template TEXT;
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS layout_template TEXT;
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS layout_rationale TEXT;
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS market_context TEXT;

-- Print / outdoor ad sizes
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS ad_size_id TEXT;
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS ad_size_id TEXT;

-- Lateral thinking: perfect analogy layer
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS creative_analogy JSONB DEFAULT '{}';

-- Creative editor overlay settings
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS overlay_settings JSONB DEFAULT '{}';

-- P0/P1 agency workflow (audit, approval, revisions, request review)
CREATE TABLE IF NOT EXISTS sm_audit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  actor       TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sm_audit_events_entity_idx
  ON sm_audit_events (entity_type, entity_id, created_at DESC);

ALTER TABLE sm_creative_requests
  ADD COLUMN IF NOT EXISTS review_token TEXT,
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS sm_creative_requests_review_token_key
  ON sm_creative_requests (review_token)
  WHERE review_token IS NOT NULL;

ALTER TABLE sm_generated_assets
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS client_comment TEXT,
  ADD COLUMN IF NOT EXISTS explore_label TEXT;

CREATE TABLE IF NOT EXISTS sm_revision_rounds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID REFERENCES sm_creative_requests(id) ON DELETE CASCADE,
  asset_id       UUID REFERENCES sm_generated_assets(id) ON DELETE CASCADE,
  round_number   INT NOT NULL DEFAULT 1,
  direction      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sm_revision_rounds_asset_idx
  ON sm_revision_rounds (asset_id, round_number DESC);

ALTER TABLE sm_asset_versions
  ADD COLUMN IF NOT EXISTS change_note TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;
