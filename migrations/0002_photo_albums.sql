-- 照片相册分类
ALTER TABLE photos ADD COLUMN album TEXT NOT NULL DEFAULT '未分类';
CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album);