import { guardAdmin, parseJsonObject } from "@/lib/admin-api";
import { normalizeCategory } from "@/lib/categories";
import { listPhotoAlbumOrder, savePhotoAlbumOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  const rows = await listPhotoAlbumOrder();
  return Response.json({ order: rows.map((row) => row.name) });
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
  if (!Array.isArray(body.order)) {
    return Response.json({ error: "缺少相册顺序" }, { status: 400 });
  }

  const names = body.order
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeCategory(value).slice(0, 80))
    .slice(0, 200);

  if (names.length === 0) {
    return Response.json({ error: "相册顺序不能为空" }, { status: 400 });
  }

  const order = await savePhotoAlbumOrder(names);
  return Response.json({ order });
}