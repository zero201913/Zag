import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, getSetting } from "./db";

export const SESSION_COOKIE = "zag_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const MAX_LOGIN_ATTEMPTS = 10;
export const LOGIN_WINDOW_SECONDS = 60 * 15;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomHex(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return toHex(data.buffer);
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyAccessCode(code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (!trimmed) return false;

  const salt = await getSetting("admin_code_salt");
  const hash = await getSetting("admin_code_hash");
  if (salt && hash) {
    return timingSafeEqual(await sha256Hex(`${salt}:${trimmed}`), hash);
  }

  // 首次使用：回退到环境变量里的专属指令
  const { env } = await getCloudflareContext({ async: true });
  const expected = env.ADMIN_ACCESS_CODE;
  if (!expected) return false;
  return timingSafeEqual(await sha256Hex(trimmed), await sha256Hex(expected));
}

export async function createAdminSession(): Promise<string> {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const db = await getDb();
  await db.prepare("DELETE FROM admin_sessions WHERE expires_at < unixepoch()").run();
  await db
    .prepare(
      "INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, unixepoch(), unixepoch() + ?)",
    )
    .bind(tokenHash, SESSION_TTL_SECONDS)
    .run();
  return token;
}

export async function getAdminSessionHash(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const db = await getDb();
  const row = await db
    .prepare("SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ token_hash: string; expires_at: number }>();

  if (!row) return null;
  if (row.expires_at <= Math.floor(Date.now() / 1000)) {
    await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  return tokenHash;
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSessionHash()) !== null;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const db = await getDb();
  await db
    .prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
    .bind(await sha256Hex(token))
    .run();
}

export async function revokeOtherSessions(currentHash: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("DELETE FROM admin_sessions WHERE token_hash != ?")
    .bind(currentHash)
    .run();
}

export async function setSessionCookie(token: string, secure: boolean) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkLoginGate(ip: string) {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count, MIN(created_at) AS first_at FROM login_attempts
       WHERE ip = ? AND created_at > unixepoch() - ?`,
    )
    .bind(ip, LOGIN_WINDOW_SECONDS)
    .first<{ count: number; first_at: number | null }>();

  const count = row?.count ?? 0;
  if (count < MAX_LOGIN_ATTEMPTS) {
    return { allowed: true, retryAfter: 0 };
  }
  const firstAt = row?.first_at ?? Math.floor(Date.now() / 1000);
  const retryAfter = Math.max(1, firstAt + LOGIN_WINDOW_SECONDS - Math.floor(Date.now() / 1000));
  return { allowed: false, retryAfter };
}

export async function recordLoginFailure(ip: string) {
  const db = await getDb();
  await db.prepare("INSERT INTO login_attempts (ip) VALUES (?)").bind(ip).run();
  await db
    .prepare("DELETE FROM login_attempts WHERE created_at < unixepoch() - 86400")
    .run();
}

export async function clearLoginAttempts(ip: string) {
  const db = await getDb();
  await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
}

/** API / 表单写操作的同源校验，配合 SameSite=Lax Cookie 防 CSRF */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}