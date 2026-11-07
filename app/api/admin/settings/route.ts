import { getDb, getSettings } from "@/lib/db";
import { guardAdmin, parseJsonObject, text } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

const EDITABLE_KEYS = [
  "hero_title",
  "hero_subtitle",
  "about_content",
  "footer_tagline",
  "github_url",
  "email",
] as const;

export async function GET(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;
  return Response.json({ settings: await getSettings() });
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
  const body = parseJsonObject(raw);
  const db = await getDb();

  for (const key of EDITABLE_KEYS) {
    if (body[key] === undefined) continue;
    const value = text(body[key], key === "about_content" ? 20000 : 2000);
    await db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .bind(key, value)
      .run();
  }

  return Response.json({ ok: true, settings: await getSettings() });
}