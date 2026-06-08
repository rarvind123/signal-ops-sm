-- Layout templates + market context (run in Supabase SQL editor)
ALTER TABLE sm_generated_assets ADD COLUMN IF NOT EXISTS layout_template TEXT;
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS layout_template TEXT;
ALTER TABLE sm_signalops_outputs ADD COLUMN IF NOT EXISTS layout_rationale TEXT;
ALTER TABLE sm_creative_requests ADD COLUMN IF NOT EXISTS market_context TEXT;
