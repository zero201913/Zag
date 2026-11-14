/** 网格缩略图的尺寸上限（长边像素）与 WebP 质量。 */
export const THUMB_MAX_EDGE = 800;
export const THUMB_QUALITY = 0.72;
/** 缩略图文件大小上限，超过说明生成参数不对，直接拒收。 */
export const THUMB_MAX_BYTES = 1024 * 1024;

/**
 * 由原图 R2 key 推出缩略图 key：保持同目录同 UUID，只换扩展名。
 * `photos/2026/11/abc.webp` → `photos/2026/11/abc.thumb.webp`
 */
export function thumbKeyFor(key: string) {
  return /\.(jpe?g|png|webp|avif|gif)$/i.test(key)
    ? key.replace(/\.[^./]+$/, ".thumb.webp")
    : `${key}.thumb.webp`;
}