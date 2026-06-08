-- Print / outdoor ad size selection (run in Supabase SQL editor)
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS ad_size_id TEXT;
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS ad_size_id TEXT;
