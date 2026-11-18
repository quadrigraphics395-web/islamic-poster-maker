CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 500),
  category TEXT NOT NULL CHECK(length(category) BETWEEN 1 AND 60),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0, 1)),
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0, 1)),
  project_json TEXT NOT NULL,
  preview_asset_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  kv_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size > 0 AND byte_size <= 25165824),
  state TEXT NOT NULL CHECK(state IN ('uploading', 'active', 'deleting')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template_assets (
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  PRIMARY KEY (template_id, asset_id)
);

CREATE INDEX IF NOT EXISTS templates_public_order ON templates(published, featured DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS template_assets_asset ON template_assets(asset_id);
CREATE INDEX IF NOT EXISTS assets_state_age ON assets(state, created_at);

CREATE TRIGGER IF NOT EXISTS asset_storage_budget
BEFORE INSERT ON assets
BEGIN
  SELECT CASE WHEN (SELECT COALESCE(SUM(byte_size), 0) FROM assets) + NEW.byte_size > 943718400
    THEN RAISE(ABORT, 'asset_storage_budget') END;
END;

CREATE TRIGGER IF NOT EXISTS published_template_insert_limit
BEFORE INSERT ON templates WHEN NEW.published = 1
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM templates WHERE published = 1) >= 100
    THEN RAISE(ABORT, 'published_template_limit') END;
END;

CREATE TRIGGER IF NOT EXISTS published_template_update_limit
BEFORE UPDATE OF published ON templates WHEN OLD.published = 0 AND NEW.published = 1
BEGIN
  SELECT CASE WHEN (SELECT COUNT(*) FROM templates WHERE published = 1) >= 100
    THEN RAISE(ABORT, 'published_template_limit') END;
END;

CREATE TRIGGER IF NOT EXISTS linked_asset_must_be_active
BEFORE INSERT ON template_assets
BEGIN
  SELECT CASE WHEN (SELECT state FROM assets WHERE id = NEW.asset_id) != 'active'
    THEN RAISE(ABORT, 'asset_not_active') END;
END;
