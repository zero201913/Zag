import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAdmin, isSameOrigin } from "./auth";
import { excerptOf, slugify } from "./utils";

export const ADMIN_RESOURCES = [
  "posts",
  "projects",
  "bookmarks",
  "photos",
  "tracks",
] as const;

export type AdminResource = (typeof ADMIN_RESOURCES)[number];

export function isAdminResource(value: string): value is AdminResource {
  return (ADMIN_RESOURCES as readonly string[]).includes(value);
}

/** 返回 null 表示鉴权通过；否则返回应直接返回的 Response。 */
export async function guardAdmin(request: Request): Promise<Response | null> {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "非法来源" }, { status: 403 });
  }
  if (!(await isAdmin())) {
    return Response.json({ error: "未登录或会话已过期" }, { status: 401 });
  }
  return null;
}

export async function getR2() {
  const { env } = await getCloudflareContext({ async: true });
  return env.BUCKET;
}

export function text(value: unknown, max = 5000, fallback = "") {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

export function requiredText(value: unknown, max = 5000) {
  return text(value, max).trim();
}

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function integer(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function normalizeTags(value: unknown) {
  const raw = Array.isArray(value) ? value.join(",") : text(value, 500);
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(",");
}

export function normalizeStatus(value: unknown) {
  return value === "draft" ? "draft" : "published";
}

export function parseJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function uniqueSlug(
  db: D1Database,
  desired: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(desired) || `post-${Date.now()}`;
  let candidate = base;
  let suffix = 1;
  for (;;) {
    const row = await db
      .prepare("SELECT id FROM posts WHERE slug = ? AND id != ?")
      .bind(candidate, excludeId ?? "")
      .first<{ id: string }>();
    if (!row) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export function postExcerpt(content: string, excerpt: string) {
  return excerpt.trim() || excerptOf(content, 150);
}