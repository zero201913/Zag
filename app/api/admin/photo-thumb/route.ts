import { getDb } from "@/lib/db";
import { getR2, guardAdmin } from "@/lib/admin-api";
import { THUMB_MAX_BYTES, thumbKeyFor } from "@/lib/photo-thumb";

export const dynamic = "force-dynamic";

/**
 * 给已存在的照片补生成网格缩略图。
 * 后台拿到原图后在浏览器里缩放，再把 WebP 传到这里，存到原图旁边并写回 thumb_key。
 */
export async function POST(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "上传数据解析失败" }, { status: 400 });
  }

  const id = String(form.get("id") || "").trim();
  const thumb = form.get("thumb");
  if (!id) return Response.json({ error: "缺少照片 ID" }, { status: 400 });
  if (!(thumb instanceof File) || thumb.size === 0) {
    return Response.json({ error: "没有收到缩略图" }, { status: 400 });
  }
  if (thumb.size > THUMB_MAX_BYTES) {
    return Response.json({ error: "缩略图文件过大" }, { status: 413 });
  }

  const db = await getDb();
  const row = await db
    .prepare("SELECT id, r2_key FROM photos WHERE id = ?")
    .bind(id)
    .first<{ id: string; r2_key: string }>();
  if (!row) return Response.json({ error: "照片不存在" }, { status: 404 });

  const key = thumbKeyFor(row.r2_key);
  try {
    const bucket = await getR2();
    await bucket.put(key, await thumb.arrayBuffer(), {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { uploadedAt: String(Math.floor(Date.now() / 1000)) },
    });
  } catch (error) {
    console.error("thumb upload failed", error);
    return Response.json(
      { error: `写入 R2 失败：${(error as Error).message}` },
      { status: 500 },
    );
  }

  await db.prepare("UPDATE photos SET thumb_key = ? WHERE id = ?").bind(key, id).run();
  const item = await db.prepare("SELECT * FROM photos WHERE id = ?").bind(id).first();
  return Response.json({ ok: true, item });
}