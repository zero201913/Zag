import { clearSessionCookie, destroyCurrentSession, isSameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "非法来源" }, { status: 403 });
  }
  await destroyCurrentSession();
  await clearSessionCookie();
  return Response.json({ ok: true });
}