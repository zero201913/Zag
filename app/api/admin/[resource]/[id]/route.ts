import { ensurePhotoAlbum, getDb } from "@/lib/db";
import {
  getR2,
  guardAdmin,
  integer,
  isAdminResource,
  normalizeStatus,
  normalizeTags,
  numberOrNull,
  parseJsonObject,
  postExcerpt,
  requiredText,
  text,
  uniqueSlug,
} from "@/lib/admin-api";
import { normalizeCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string | null;
  tags: string;
  status: string;
  featured: number;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  url: string;
  repo_url: string | null;
  icon: string;
  tags: string;
  sort_order: number;
}

interface BookmarkRow {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
}

interface PhotoRow {
  id: string;
  title: string;
  description: string;
  album: string;
  r2_key: string;
  width: number | null;
  height: number | null;
  taken_at: number | null;
}

interface TrackRow {
  id: string;
  title: string;
  artist: string;
  album: string;
  r2_key: string;
  cover_key: string | null;
  duration: number | null;
  sort_order: number;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: number;
  updated_at: number;
}

async function fetchRow(resource: string, id: string) {
  const db = await getDb();
  return db.prepare(`SELECT * FROM ${resource} WHERE id = ?`).bind(id).first();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { resource, id } = await context.params;
  if (!isAdminResource(resource)) {
    return Response.json({ error: "未知资源" }, { status: 404 });
  }

  const item = await fetchRow(resource, id);
  if (!item) return Response.json({ error: "内容不存在" }, { status: 404 });
  return Response.json({ item });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { resource, id } = await context.params;
  if (!isAdminResource(resource)) {
    return Response.json({ error: "未知资源" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const body = parseJsonObject(raw);
  const db = await getDb();
  const existing = await fetchRow(resource, id);
  if (!existing) return Response.json({ error: "内容不存在" }, { status: 404 });

  if (resource === "posts") {
    const row = existing as unknown as PostRow;
    const title = requiredText(body.title, 200) || row.title;
    if (!title) return Response.json({ error: "文章标题不能为空" }, { status: 400 });
    const content = text(body.content, 400000, row.content);
    const slugInput = text(body.slug, 120, row.slug) || row.slug;
    const slug =
      slugInput === row.slug ? row.slug : await uniqueSlug(db, slugInput, id);
    const excerpt = text(body.excerpt, 600, row.excerpt) || postExcerpt(content, "");
    const tags = body.tags === undefined ? row.tags : normalizeTags(body.tags);
    const status = body.status === undefined ? row.status : normalizeStatus(body.status);
    const featured =
      body.featured === undefined ? row.featured : body.featured ? 1 : 0;
    const cover =
      body.cover_url === undefined
        ? row.cover_url
        : text(body.cover_url, 1000).trim() || null;

    await db
      .prepare(
        `UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, cover_url = ?,
         tags = ?, status = ?, featured = ?, updated_at = unixepoch() WHERE id = ?`,
      )
      .bind(title, slug, excerpt, content, cover, tags, status, featured, id)
      .run();
  } else if (resource === "projects") {
    const row = existing as unknown as ProjectRow;
    const name = requiredText(body.name, 120) || row.name;
    await db
      .prepare(
        `UPDATE projects SET name = ?, description = ?, url = ?, repo_url = ?, icon = ?, tags = ?, sort_order = ? WHERE id = ?`,
      )
      .bind(
        name,
        text(body.description, 1000, row.description),
        text(body.url, 1000, row.url),
        body.repo_url === undefined
          ? row.repo_url
          : text(body.repo_url, 1000).trim() || null,
        text(body.icon, 40, row.icon) || "sparkles",
        body.tags === undefined ? row.tags : normalizeTags(body.tags),
        integer(body.sort_order, row.sort_order),
        id,
      )
      .run();
  } else if (resource === "bookmarks") {
    const row = existing as unknown as BookmarkRow;
    const title = requiredText(body.title, 160) || row.title;
    const url = requiredText(body.url, 1000) || row.url;
    await db
      .prepare(
        `UPDATE bookmarks SET title = ?, url = ?, description = ?, category = ? WHERE id = ?`,
      )
      .bind(
        title,
        url,
        text(body.description, 600, row.description),
        text(body.category, 60, row.category) || "收藏",
        id,
      )
      .run();
  } else if (resource === "photos") {
    const row = existing as unknown as PhotoRow;
    const r2Key = requiredText(body.r2_key, 500) || row.r2_key;
    const album = normalizeCategory(text(body.album, 80, row.album));
    await db
      .prepare(
        `UPDATE photos SET title = ?, description = ?, album = ?, r2_key = ?, width = ?, height = ?, taken_at = ? WHERE id = ?`,
      )
      .bind(
        text(body.title, 160, row.title),
        text(body.description, 600, row.description),
        album,
        r2Key,
        body.width === undefined ? row.width : numberOrNull(body.width),
        body.height === undefined ? row.height : numberOrNull(body.height),
        body.taken_at === undefined ? row.taken_at : numberOrNull(body.taken_at),
        id,
      )
      .run();
    await ensurePhotoAlbum(album);

    if (r2Key !== row.r2_key) {
      try {
        const bucket = await getR2();
        await bucket.delete(row.r2_key);
      } catch (error) {
        console.error("failed to delete old photo object", error);
      }
    }
  } else if (resource === "notes") {
    const row = existing as unknown as NoteRow;
    const content = requiredText(body.content, 2000) || row.content;

    await db
      .prepare("UPDATE notes SET content = ?, updated_at = unixepoch() WHERE id = ?")
      .bind(content, id)
      .run();
  } else {
    const row = existing as unknown as TrackRow;
    const r2Key = requiredText(body.r2_key, 500) || row.r2_key;
    const coverKey =
      body.cover_key === undefined
        ? row.cover_key
        : text(body.cover_key, 500).trim() || null;

    await db
      .prepare(
        `UPDATE tracks SET title = ?, artist = ?, album = ?, r2_key = ?, cover_key = ?, duration = ?, sort_order = ? WHERE id = ?`,
      )
      .bind(
        requiredText(body.title, 200) || row.title,
        text(body.artist, 120, row.artist),
        normalizeCategory(text(body.album, 120, row.album)),
        r2Key,
        coverKey,
        body.duration === undefined ? row.duration : numberOrNull(body.duration),
        integer(body.sort_order, row.sort_order),
        id,
      )
      .run();

    try {
      const bucket = await getR2();
      if (r2Key !== row.r2_key) await bucket.delete(row.r2_key);
      if (coverKey !== row.cover_key && row.cover_key) await bucket.delete(row.cover_key);
    } catch (error) {
      console.error("failed to delete old track object", error);
    }
  }

  return Response.json({ item: await fetchRow(resource, id) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { resource, id } = await context.params;
  if (!isAdminResource(resource)) {
    return Response.json({ error: "未知资源" }, { status: 404 });
  }

  const db = await getDb();
  const existing = await fetchRow(resource, id);
  if (!existing) return Response.json({ error: "内容不存在" }, { status: 404 });

  await db.prepare(`DELETE FROM ${resource} WHERE id = ?`).bind(id).run();

  if (resource === "photos" || resource === "tracks") {
    try {
      const row = existing as unknown as PhotoRow | TrackRow;
      const bucket = await getR2();
      await bucket.delete(row.r2_key);
      if (resource === "tracks" && "cover_key" in row && row.cover_key) {
        await bucket.delete(row.cover_key);
      }
    } catch (error) {
      console.error("failed to delete media object", error);
    }
  }

  return Response.json({ ok: true });
}