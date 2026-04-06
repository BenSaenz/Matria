-- 0001_init.sql
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  title TEXT,
  tagline TEXT,
  story TEXT,
  pack_name TEXT,
  pack_story TEXT,
  cta_label TEXT,
  featured INTEGER DEFAULT 1,
  show_on_home INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  media_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  collection_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT DEFAULT 'ritual',
  price REAL NOT NULL DEFAULT 0,
  badge TEXT,
  technical_blend TEXT,
  sales_speech TEXT,
  short_description TEXT,
  description TEXT,
  descriptions_json TEXT DEFAULT '[]',
  features_json TEXT DEFAULT '[]',
  discount_enabled INTEGER DEFAULT 0,
  discount_type TEXT DEFAULT 'percent',
  discount_value REAL DEFAULT 0,
  media_json TEXT DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES collections(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  min_order REAL DEFAULT 0,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_collection_id ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

INSERT OR REPLACE INTO meta (key, value, updated_at)
VALUES (
  'store_revision',
  '{"id":"seed-init","resource":"seed","at":"2026-04-04T00:00:00.000Z"}',
  CURRENT_TIMESTAMP
);
