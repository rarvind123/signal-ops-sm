-- Strategy protection + review columns (run in Supabase SQL editor)
ALTER TABLE sm_campaigns
  ADD COLUMN IF NOT EXISTS review_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_token TEXT;
