-- 相册展示顺序（后台可调整，公开照片页按此顺序分组展示）
CREATE TABLE IF NOT EXISTS photo_albums (
  name TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0
);