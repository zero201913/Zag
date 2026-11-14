import { guardAdmin, parseJsonObject } from "@/lib/admin-api";
import { getDb, getSetting } from "@/lib/db";
import { normalizeHomePhotos, parseHomePhotos } from "@/lib/home-photos";

export const dynamic = "force-dynamic";

const SETTING_KEY = "home_photos";

export async function GET(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  return Response.json({ config: parseHomePhotos(await getSetting(SETTING_KEY)) });
}

export async function PUT(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const config = normalizeHomePhotos(parseJsonObject(raw));
  const db = await getDb();
  const { results } = await db.prepare("SELECT id FROM photos").all<{ id: string }>();
  const existing = new Set((results ?? []).map((row) => row.id));

  // 只保留真实存在的照片，并按上限截断
  config.ids = config.ids.filter((id) => existing.has(id)).slice(0, config.limit);

  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(SETTING_KEY, JSON.stringify(config))
    .run();

  return Response.json({ ok: true, config });
}