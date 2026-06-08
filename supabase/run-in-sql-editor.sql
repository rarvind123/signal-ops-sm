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
