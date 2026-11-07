import { getDb } from "@/lib/db";
import {
  getAdminSessionHash,
  randomHex,
  revokeOtherSessions,
  sha256Hex,
  verifyAccessCode,
} from "@/lib/auth";
import { guardAdmin, parseJsonObject, text } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

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
  const currentCode = text(body.currentCode, 200).trim();
  const newCode = text(body.newCode, 200).trim();

  if (!newCode) {
    return Response.json({ error: "新指令代码不能为空" }, { status: 400 });
  }
  if (newCode.length < 6 || newCode.length > 64) {
    return Response.json({ error: "新指令代码长度需要在 6-64 个字符之间" }, { status: 400 });
  }
  if (!(await verifyAccessCode(currentCode))) {
    return Response.json({ error: "当前指令代码不正确" }, { status: 401 });
  }

  const salt = randomHex(16);
  const hash = await sha256Hex(`${salt}:${newCode}`);
  const db = await getDb();

  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('admin_code_salt', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(salt)
    .run();
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('admin_code_hash', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(hash)
    .run();

  const currentHash = await getAdminSessionHash();
  if (currentHash) await revokeOtherSessions(currentHash);

  return Response.json({ ok: true });
}