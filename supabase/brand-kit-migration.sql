-- Brand Kit v1 — extend sm_clients
ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS logo_primary_url    TEXT,
  ADD COLUMN IF NOT EXISTS logo_white_url      TEXT,
  ADD COLUMN IF NOT EXISTS logo_dark_url       TEXT,
  ADD COLUMN IF NOT EXISTS logo_symbol_url     TEXT;

ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS color_primary       TEXT,
  ADD COLUMN IF NOT EXISTS color_secondary     TEXT,
  ADD COLUMN IF NOT EXISTS color_accent        TEXT,
  ADD COLUMN IF NOT EXISTS color_background    TEXT,
  ADD COLUMN IF NOT EXISTS color_text          TEXT;

ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS font_primary        TEXT,
  ADD COLUMN IF NOT EXISTS font_secondary      TEXT,
  ADD COLUMN IF NOT EXISTS font_source         TEXT CHECK (font_source IN ('google', 'system', 'custom'));

ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS photo_style         TEXT CHECK (photo_style IN (
    'lifestyle', 'product', 'minimal', 'documentary', 'illustrated', 'premium'
  ));

ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS voice_description   TEXT,
  ADD COLUMN IF NOT EXISTS voice_do            JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS voice_dont          JSONB DEFAULT '[]';

ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS guidelines_pdf_url  TEXT,
  ADD COLUMN IF NOT EXISTS guidelines_summary  TEXT;

ALTER TABLE sm_clients
  ADD COLUMN IF NOT EXISTS has_brand_kit       BOOLEAN DEFAULT FALSE;

-- Backfill primary logo from legacy logo_url
UPDATE sm_clients
SET logo_primary_url = logo_url
WHERE logo_primary_url IS NULL AND logo_url IS NOT NULL;
