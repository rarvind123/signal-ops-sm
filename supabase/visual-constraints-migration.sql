-- Visual constraints on creative requests
ALTER TABLE sm_creative_requests
  ADD COLUMN IF NOT EXISTS must_include TEXT,
  ADD COLUMN IF NOT EXISTS must_exclude TEXT;
