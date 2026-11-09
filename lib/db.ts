import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DEFAULT_SETTINGS } from "./site";
import type {
  Background,
  BlogStats,
  Bookmark,
  Note,
  Photo,
  Post,
  PostPage,
  PostSummary,
  Project,
  SearchHit,
  SiteSettings,
  Track,
} from "./types";

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

const POST_LIST_COLUMNS =
  "id, slug, title, excerpt, cover_url, tags, status, featured, created_at, updated_at";

interface PostQuery {
  includeDrafts?: boolean;
  limit?: number;
  tag?: string;
  query?: string;
}

export async function listPosts(options: PostQuery = {}): Promise<PostSummary[]> {
  const { includeDrafts = false, limit = 60, tag, query } = options;
  const db = await getDb();
  const where: string[] = [];
  const binds: Array<string | number> = [];

  if (!includeDrafts) where.push("status = 'published'");
  if (tag) {
    where.push("(',' || tags || ',') LIKE ?");
    binds.push(`%,${tag},%`);
  }
  if (query) {
    where.push("(title LIKE ? OR excerpt LIKE ? OR tags LIKE ?)");
    const like = `%${query}%`;
    binds.push(like, like, like);
  }

  const sql = `SELECT ${POST_LIST_COLUMNS} FROM posts
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY featured DESC, created_at DESC
    LIMIT ?`;
  binds.push(limit);

  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<PostSummary>();
  return results ?? [];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'")
    .bind(slug)
    .first<Post>();
}

export async function getPostById(id: string): Promise<Post | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first<Post>();
}

export async function listAdminPosts(): Promise<Post[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM posts ORDER BY featured DESC, created_at DESC")
    .all<Post>();
  return results ?? [];
}

export const ADMIN_POST_PAGE_SIZE = 10;

export async function listAdminPostsPage(
  options: { page?: number; query?: string } = {},
): Promise<PostPage> {
  const pageSize = ADMIN_POST_PAGE_SIZE;
  const query = (options.query ?? "").trim();
  const db = await getDb();
  const where = query ? "WHERE title LIKE ? ESCAPE '\\'" : "";
  const filters: string[] = query ? [likeQuery(query)] : [];

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM posts ${where}`)
    .bind(...filters)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(options.page ?? 1) || 1), totalPages);

  const { results } = await db
    .prepare(
      `SELECT * FROM posts ${where}
       ORDER BY featured DESC, created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...filters, pageSize, (page - 1) * pageSize)
    .all<Post>();

  return { items: results ?? [], total, page, pageSize, totalPages, query };
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC")
    .all<Project>();
  return results ?? [];
}

export async function listBookmarks(): Promise<Bookmark[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM bookmarks ORDER BY category ASC, created_at DESC")
    .all<Bookmark>();
  return results ?? [];
}

export async function listBackgrounds(): Promise<Background[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM backgrounds ORDER BY sort_order ASC, created_at DESC")
    .all<Background>();
  return results ?? [];
}

export async function listNotes(options: { limit?: number } = {}): Promise<Note[]> {
  const { limit = 30 } = options;
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM notes ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<Note>();
  return results ?? [];
}

export async function listPhotos(): Promise<Photo[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM photos ORDER BY COALESCE(taken_at, created_at) DESC")
    .all<Photo>();
  return results ?? [];
}

export interface AlbumOrderRow {
  name: string;
  sort_order: number;
}

/** 读取后台配置的相册顺序，未出现在表里的相册由调用方按名称兜底排序。 */
export async function listPhotoAlbumOrder(): Promise<AlbumOrderRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT name, sort_order FROM photo_albums ORDER BY sort_order ASC, name ASC")
    .all<AlbumOrderRow>();
  return results ?? [];
}

/** 新相册默认排到末尾；已存在则保持原顺序不变。 */
export async function ensurePhotoAlbum(name: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO photo_albums (name, sort_order)
       VALUES (?, COALESCE((SELECT MAX(sort_order) + 1 FROM photo_albums), 0))
       ON CONFLICT(name) DO NOTHING`,
    )
    .bind(name)
    .run();
}

/** 用完整顺序覆盖相册排序，并清掉已不在列表里的旧相册记录。 */
export async function savePhotoAlbumOrder(names: string[]): Promise<string[]> {
  const unique = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (unique.length === 0) return [];

  const db = await getDb();
  const statements = unique.map((name, index) =>
    db
      .prepare(
        `INSERT INTO photo_albums (name, sort_order) VALUES (?, ?)
         ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order`,
      )
      .bind(name, index),
  );
  const placeholders = unique.map(() => "?").join(", ");
  statements.push(
    db.prepare(`DELETE FROM photo_albums WHERE name NOT IN (${placeholders})`).bind(...unique),
  );
  await db.batch(statements);
  return unique;
}

export async function listTracks(): Promise<Track[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT * FROM tracks ORDER BY sort_order ASC, created_at DESC")
    .all<Track>();
  return results ?? [];
}

export async function getSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT key, value FROM settings")
    .all<{ key: string; value: string }>();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of results ?? []) map[row.key] = row.value;
  return map as SiteSettings;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function getStats(): Promise<BlogStats> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT
      (SELECT COUNT(*) FROM posts WHERE status = 'published') AS posts,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM bookmarks) AS bookmarks,
      (SELECT COUNT(*) FROM photos) AS photos,
      (SELECT COUNT(*) FROM tracks) AS tracks,
      (SELECT COUNT(*) FROM notes) AS notes`)
    .first<BlogStats>();
  return row ?? { posts: 0, projects: 0, bookmarks: 0, photos: 0, tracks: 0, notes: 0 };
}

export async function getAdminStats(): Promise<BlogStats & { drafts: number }> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT
      (SELECT COUNT(*) FROM posts WHERE status = 'published') AS posts,
      (SELECT COUNT(*) FROM posts WHERE status = 'draft') AS drafts,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM bookmarks) AS bookmarks,
      (SELECT COUNT(*) FROM photos) AS photos,
      (SELECT COUNT(*) FROM tracks) AS tracks,
      (SELECT COUNT(*) FROM notes) AS notes`)
    .first<BlogStats & { drafts: number }>();
  return row ?? { posts: 0, drafts: 0, projects: 0, bookmarks: 0, photos: 0, tracks: 0, notes: 0 };
}

function likeQuery(q: string) {
  return `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
}

export async function searchAll(rawQuery: string): Promise<SearchHit[]> {
  const q = rawQuery.trim().slice(0, 60);
  if (!q) return [];
  const db = await getDb();
  const like = likeQuery(q);

  const [posts, projects, bookmarks, photos, tracks] = await Promise.all([
    db
      .prepare(`SELECT id, slug, title, excerpt, tags FROM posts
        WHERE status = 'published' AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')
        ORDER BY featured DESC, created_at DESC LIMIT 6`)
      .bind(like, like, like)
      .all<{ id: string; slug: string; title: string; excerpt: string; tags: string }>(),
    db
      .prepare(`SELECT id, name, description, tags FROM projects
        WHERE name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
        ORDER BY sort_order ASC LIMIT 4`)
      .bind(like, like, like)
      .all<{ id: string; name: string; description: string; tags: string }>(),
    db
      .prepare(`SELECT id, title, description, category FROM bookmarks
        WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\'
        ORDER BY created_at DESC LIMIT 4`)
      .bind(like, like, like)
      .all<{ id: string; title: string; description: string; category: string }>(),
    db
      .prepare(`SELECT id, title, description, album FROM photos
        WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR album LIKE ? ESCAPE '\\'
        ORDER BY created_at DESC LIMIT 4`)
      .bind(like, like, like)
      .all<{ id: string; title: string; description: string; album: string }>(),
    db
      .prepare(`SELECT id, title, artist, album FROM tracks
        WHERE title LIKE ? ESCAPE '\\' OR artist LIKE ? ESCAPE '\\' OR album LIKE ? ESCAPE '\\'
        ORDER BY sort_order ASC LIMIT 4`)
      .bind(like, like, like)
      .all<{ id: string; title: string; artist: string; album: string }>(),
  ]);

  const hits: SearchHit[] = [];
  for (const p of posts.results ?? []) {
    hits.push({
      type: "post",
      id: p.id,
      title: p.title,
      subtitle: p.excerpt || p.tags,
      href: `/posts/${encodeURIComponent(p.slug)}`,
    });
  }
  for (const p of projects.results ?? []) {
    hits.push({
      type: "project",
      id: p.id,
      title: p.name,
      subtitle: p.description || p.tags,
      href: `/projects#project-${p.id}`,
    });
  }
  for (const b of bookmarks.results ?? []) {
    hits.push({
      type: "bookmark",
      id: b.id,
      title: b.title,
      subtitle: b.description || b.category,
      href: `/bookmarks#bookmark-${b.id}`,
    });
  }
  for (const p of photos.results ?? []) {
    hits.push({
      type: "photo",
      id: p.id,
      title: p.title || "未命名照片",
      subtitle: p.description || p.album,
      href: `/photos#photo-${p.id}`,
    });
  }
  for (const t of tracks.results ?? []) {
    hits.push({
      type: "track",
      id: t.id,
      title: t.title,
      subtitle: [t.artist, t.album].filter(Boolean).join(" · "),
      href: `/music#track-${t.id}`,
    });
  }
  return hits;
}