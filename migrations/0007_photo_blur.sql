-- 照片缩略图模糊遮罩：1 表示列表缩略图默认打码（用于非工作安全内容）
ALTER TABLE photos ADD COLUMN blurred INTEGER NOT NULL DEFAULT 0;