-- 照片缩略图：网格和列表用 thumb_key 的小图，灯箱仍用 r2_key 原图。
-- 上传时在后台浏览器里生成，旧照片可以留空（页面自动回退原图），再在后台一键补生成。
ALTER TABLE photos ADD COLUMN thumb_key TEXT;