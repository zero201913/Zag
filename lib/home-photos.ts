import type { Photo } from "./types";

/** 首页「最近的照片」最多展示几张 */
export const HOME_PHOTOS_LIMIT_MIN = 1;
export const HOME_PHOTOS_LIMIT_MAX = 12;

export type HomePhotosMode = "auto" | "manual";

export interface HomePhotosConfig {
  /** auto = 按拍摄时间取最新；manual = 按 ids 里挑好的顺序 */
  mode: HomePhotosMode;
  /** 最多展示几张，两种模式都受它限制 */
  limit: number;
  /** 手动挑选的照片 id，按展示顺序排列 */
  ids: string[];
}

export const DEFAULT_HOME_PHOTOS: HomePhotosConfig = {
  mode: "auto",
  limit: 6,
  ids: [],
};

function clampLimit(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(HOME_PHOTOS_LIMIT_MAX, Math.max(HOME_PHOTOS_LIMIT_MIN, Math.trunc(n)));
}

/** 后台提交上来的原始数据做一次范围收敛，避免脏数据写进 settings */
export function normalizeHomePhotos(value: unknown): HomePhotosConfig {
  const record =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const mode: HomePhotosMode = record.mode === "manual" ? "manual" : "auto";
  const ids = Array.isArray(record.ids)
    ? Array.from(
        new Set(
          record.ids.filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0,
          ),
        ),
      ).slice(0, HOME_PHOTOS_LIMIT_MAX)
    : [];

  return {
    mode,
    limit: clampLimit(record.limit, DEFAULT_HOME_PHOTOS.limit),
    ids,
  };
}

/** 读取 settings.home_photos 里保存的 JSON */
export function parseHomePhotos(raw: string | null | undefined): HomePhotosConfig {
  if (!raw) return DEFAULT_HOME_PHOTOS;
  try {
    return normalizeHomePhotos(JSON.parse(raw));
  } catch {
    return DEFAULT_HOME_PHOTOS;
  }
}

/**
 * 把配置解析成实际要展示的照片。
 * - auto：取最新的 limit 张
 * - manual：按 ids 顺序取，已删除的照片自动跳过
 * - 手动模式一张都没挑（或都已被删）时回退到最新，避免首页区块突然消失
 */
export function resolveHomePhotos(config: HomePhotosConfig, photos: Photo[]): Photo[] {
  const limit = clampLimit(config.limit, DEFAULT_HOME_PHOTOS.limit);

  if (config.mode === "manual") {
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    const picked = config.ids
      .map((id) => byId.get(id))
      .filter((photo): photo is Photo => Boolean(photo))
      .slice(0, limit);
    if (picked.length > 0) return picked;
  }

  return photos.slice(0, limit);
}