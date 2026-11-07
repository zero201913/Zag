export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(unixSeconds: number, locale = "zh-CN") {
  if (!unixSeconds) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(unixSeconds * 1000));
}

export function formatShortDate(unixSeconds: number) {
  if (!unixSeconds) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function slugify(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/['"“”‘’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `post-${Date.now()}`;
}

export function readingTime(content: string) {
  const chinese = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = content.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(chinese / 350 + words / 220));
  return `${minutes} 分钟阅读`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds < 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function mediaUrl(key: string | null | undefined) {
  if (!key) return "";
  if (/^(https?:)?\/\//.test(key) || key.startsWith("/")) return key;
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function excerptOf(text: string, length = 120) {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`_\-\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}