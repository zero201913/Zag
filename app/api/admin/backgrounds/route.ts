import { getDb, listBackgrounds } from "@/lib/db";
import { guardAdmin, integer, parseJsonObject, requiredText, text } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;
  return Response.json({ items: await listBackgrounds() });
}

export async function POST(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const body = parseJsonObject(raw);
  const name = requiredText(body.name, 80);
  const r2Key = requiredText(body.r2_key, 500);
  if (!name || !r2Key) {
    return Response.json({ error: "背景名称和文件不能为空" }, { status: 400 });
  }
  if (!r2Key.startsWith("backgrounds/")) {
    return Response.json({ error: "背景文件必须位于 backgrounds/ 目录" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db
    .prepare("SELECT id FROM backgrounds WHERE r2_key = ?")
    .bind(r2Key)
    .first<{ id: string }>();
  if (existing) {
    return Response.json({ error: "这张背景已经存在" }, { status: 409 });
  }

  const next = await db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS value FROM backgrounds")
    .first<{ value: number }>();
  const id = crypto.randomUUID();

  await db
    .prepare(
      "INSERT INTO backgrounds (id, name, r2_key, sort_order) VALUES (?, ?, ?, ?)",
    )
    .bind(id, name, r2Key, integer(body.sort_order, next?.value ?? 1))
    .run();

  const item = await db
    .prepare("SELECT * FROM backgrounds WHERE id = ?")
    .bind(id)
    .first();
  return Response.json({ item }, { status: 201 });
}