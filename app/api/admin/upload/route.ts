import { getR2, guardAdmin } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

const KINDS = {
  photo: {
    prefix: "photos",
    maxBytes: 25 * 1024 * 1024,
    mime: /^image\/(jpeg|png|webp|gif|avif)$/i,
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  },
  cover: {
    prefix: "covers",
    maxBytes: 20 * 1024 * 1024,
    mime: /^image\/(jpeg|png|webp|gif|avif)$/i,
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  },
  avatar: {
    prefix: "avatars",
    maxBytes: 10 * 1024 * 1024,
    mime: /^image\/(jpeg|png|webp|gif|avif)$/i,
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  },
  background: {
    prefix: "backgrounds",
    maxBytes: 25 * 1024 * 1024,
    mime: /^image\/(jpeg|png|webp|gif|avif)$/i,
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  },
  audio: {
    prefix: "music",
    maxBytes: 60 * 1024 * 1024,
    mime: /^audio\/[a-z0-9.+-]+$/i,
    extensions: ["mp3", "wav", "m4a", "aac", "ogg", "oga", "flac", "opus", "weba"],
  },
} as const;

type Kind = keyof typeof KINDS;

export async function POST(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "上传数据解析失败" }, { status: 400 });
  }

  const kindValue = String(form.get("kind") || "photo");
  if (!(kindValue in KINDS)) {
    return Response.json({ error: "未知的上传类型" }, { status: 400 });
  }
  const kind = kindValue as Kind;
  const config = KINDS[kind];

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "没有收到文件" }, { status: 400 });
  }
  if (file.size > config.maxBytes) {
    return Response.json(
      { error: `文件太大，最大 ${Math.round(config.maxBytes / 1024 / 1024)}MB` },
      { status: 413 },
    );
  }

  const extFromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ext = (config.extensions as readonly string[]).includes(extFromName)
    ? extFromName
    : kind === "audio"
      ? "mp3"
      : "jpg";

  if (file.type && !config.mime.test(file.type)) {
    return Response.json({ error: `不支持的文件类型：${file.type}` }, { status: 415 });
  }

  const now = new Date();
  const folder = `${config.prefix}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  const bucket = await getR2();
  try {
    const bytes = await file.arrayBuffer();
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: file.type || (kind === "audio" ? "audio/mpeg" : "image/jpeg"),
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        originalName: file.name.slice(0, 200),
        uploadedAt: String(Math.floor(Date.now() / 1000)),
      },
    });
  } catch (error) {
    console.error("R2 upload failed", error);
    return Response.json(
      { error: `写入 R2 失败：${(error as Error).message}` },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    key,
    url: `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`,
    size: file.size,
    type: file.type,
  });
}