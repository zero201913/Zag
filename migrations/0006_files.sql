-- R2 文件库：代码 / 文本 / HTML / Markdown 等可预览、可下载的文件
CREATE TABLE IF NOT EXISTS files (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  r2_key        TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL DEFAULT '',
  ext           TEXT NOT NULL DEFAULT '',
  mime          TEXT NOT NULL DEFAULT 'text/plain',
  size          INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_ext ON files(ext);