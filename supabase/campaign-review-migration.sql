-- Campaign review flow: brief approval + client share link
ALTER TABLE sm_creative_briefs
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_comment TEXT;

ALTER TABLE sm_campaigns
  ADD COLUMN IF NOT EXISTS review_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN DEFAULT FALSE;
