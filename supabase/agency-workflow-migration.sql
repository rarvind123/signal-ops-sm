-- P0/P1 agency workflow: audit trail, asset approval, revision rounds, request review links

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
