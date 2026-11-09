import {
  getDb,
  getPostById,
  listAdminPostsPage,
  listBookmarks,
  listNotes,
  listPhotos,
  listProjects,
  listTracks,
} from "@/lib/db";
import {
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

export async function GET(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { resource } = await context.params;
  if (!isAdminResource(resource)) {
    return Response.json({ error: "未知资源" }, { status: 404 });
  }

  const db = await getDb();
  switch (resource) {
    case "posts": {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "1") || 1;
      const query = url.searchParams.get("q") ?? "";
      return Response.json(await listAdminPostsPage({ page, query }));
    }
    case "projects":
      return Response.json({ items: await listProjects() });
    case "bookmarks":
      return Response.json({ items: await listBookmarks() });
    case "photos":
      return Response.json({ items: await listPhotos() });
    case "tracks":
      return Response.json({ items: await listTracks() });
    case "notes":
      return Response.json({ items: await listNotes({ limit: 500 }) });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { resource } = await context.params;
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

  if (resource === "posts") {
    const title = requiredText(body.title, 200);
    if (!title) return Response.json({ error: "文章标题不能为空" }, { status: 400 });

    const content = text(body.content, 400000);
    const id = crypto.randomUUID();
    const slug = await uniqueSlug(db, text(body.slug, 120) || title);
    const excerpt = postExcerpt(content, text(body.excerpt, 600));
    const tags = normalizeTags(body.tags);
    const status = normalizeStatus(body.status);
    const featured = body.featured ? 1 : 0;
    const cover = text(body.cover_url, 1000).trim() || null;

    await db
      .prepare(
        `INSERT INTO posts (id, slug, title, excerpt, content, cover_url, tags, status, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      )
      .bind(id, slug, title, excerpt, content, cover, tags, status, featured)
      .run();

    return Response.json({ item: await getPostById(id) }, { status: 201 });
  }

  if (resource === "projects") {
    const name = requiredText(body.name, 120);
    if (!name) return Response.json({ error: "项目名称不能为空" }, { status: 400 });
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO projects (id, name, description, url, repo_url, icon, tags, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        name,
        text(body.description, 1000),
        text(body.url, 1000),
        text(body.repo_url, 1000).trim() || null,
        text(body.icon, 40) || "sparkles",
        normalizeTags(body.tags),
        integer(body.sort_order, 0),
      )
      .run();

    const item = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
    return Response.json({ item }, { status: 201 });
  }

  if (resource === "bookmarks") {
    const title = requiredText(body.title, 160);
    const url = requiredText(body.url, 1000);
    if (!title || !url) {
      return Response.json({ error: "标题和链接不能为空" }, { status: 400 });
    }
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO bookmarks (id, title, url, description, category)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        title,
        url,
        text(body.description, 600),
        text(body.category, 60).trim() || "收藏",
      )
      .run();

    const item = await db.prepare("SELECT * FROM bookmarks WHERE id = ?").bind(id).first();
    return Response.json({ item }, { status: 201 });
  }

  if (resource === "photos") {
    const r2Key = requiredText(body.r2_key, 500);
    if (!r2Key) return Response.json({ error: "请先上传照片文件" }, { status: 400 });
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO photos (id, title, description, album, r2_key, width, height, taken_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        text(body.title, 160),
        text(body.description, 600),
        normalizeCategory(text(body.album, 80)),
        r2Key,
        numberOrNull(body.width),
        numberOrNull(body.height),
        numberOrNull(body.taken_at),
      )
      .run();

    const item = await db.prepare("SELECT * FROM photos WHERE id = ?").bind(id).first();
    return Response.json({ item }, { status: 201 });
  }

  if (resource === "notes") {
    const content = requiredText(body.content, 2000);
    if (!content) return Response.json({ error: "说说内容不能为空" }, { status: 400 });
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO notes (id, content, created_at, updated_at)
         VALUES (?, ?, unixepoch(), unixepoch())`,
      )
      .bind(id, content)
      .run();

    const item = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
    return Response.json({ item }, { status: 201 });
  }

  const title = requiredText(body.title, 200);
  const r2Key = requiredText(body.r2_key, 500);
  if (!title || !r2Key) {
    return Response.json({ error: "歌曲名称和音频文件不能为空" }, { status: 400 });
  }
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO tracks (id, title, artist, album, r2_key, cover_key, duration, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      title,
      text(body.artist, 120),
      normalizeCategory(text(body.album, 120)),
      r2Key,
      text(body.cover_key, 500).trim() || null,
      numberOrNull(body.duration),
      integer(body.sort_order, 0),
    )
    .run();

  const item = await db.prepare("SELECT * FROM tracks WHERE id = ?").bind(id).first();
  return Response.json({ item }, { status: 201 });
}