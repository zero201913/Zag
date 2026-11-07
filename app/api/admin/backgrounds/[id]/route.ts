import { getDb } from "@/lib/db";
import { getR2, guardAdmin, integer, parseJsonObject, requiredText } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

interface BackgroundRow {
  id: string;
  name: string;
  r2_key: string;
  sort_order: number;
}

async function fetchRow(id: string) {
  const db = await getDb();
  return db.prepare("SELECT * FROM backgrounds WHERE id = ?").bind(id).first<BackgroundRow>();
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  const existing = await fetchRow(id);
  if (!existing) return Response.json({ error: "背景不存在" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const body = parseJsonObject(raw);
  const name = requiredText(body.name, 80) || existing.name;
  const sortOrder =
    body.sort_order === undefined ? existing.sort_order : integer(body.sort_order, existing.sort_order);

  const db = await getDb();
  await db
    .prepare("UPDATE backgrounds SET name = ?, sort_order = ? WHERE id = ?")
    .bind(name, sortOrder, id)
    .run();

  return Response.json({ item: await fetchRow(id) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  const existing = await fetchRow(id);
  if (!existing) return Response.json({ error: "背景不存在" }, { status: 404 });

  const db = await getDb();
  await db.prepare("DELETE FROM backgrounds WHERE id = ?").bind(id).run();

  if (existing.r2_key.startsWith("backgrounds/")) {
    try {
      const bucket = await getR2();
      await bucket.delete(existing.r2_key);
    } catch (error) {
      console.error("failed to delete background object", error);
    }
  }

  return Response.json({ ok: true });
}