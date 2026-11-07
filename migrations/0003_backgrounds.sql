-- R2 背景图片索引
CREATE TABLE IF NOT EXISTS backgrounds (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_backgrounds_sort ON backgrounds(sort_order ASC, created_at DESC);

INSERT OR IGNORE INTO backgrounds (id, name, r2_key, sort_order) VALUES
  ('bg-hanami', '花海', 'backgrounds/hanami.webp', 1),
  ('bg-white-rose', '白玫瑰', 'backgrounds/white-rose.webp', 2),
  ('bg-night', '夜色', 'backgrounds/night.webp', 3);