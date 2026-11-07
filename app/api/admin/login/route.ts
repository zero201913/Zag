import {
  checkLoginGate,
  clearLoginAttempts,
  createAdminSession,
  getClientIp,
  isSameOrigin,
  recordLoginFailure,
  setSessionCookie,
  verifyAccessCode,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "非法来源" }, { status: 403 });
  }

  const ip = getClientIp(request.headers);
  const gate = await checkLoginGate(ip);
  if (!gate.allowed) {
    return Response.json(
      {
        error: `尝试次数过多，请 ${Math.ceil(gate.retryAfter / 60)} 分钟后再试。`,
        retryAfter: gate.retryAfter,
      },
      { status: 429 },
    );
  }

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }

  if (!code.trim()) {
    return Response.json({ error: "请输入专属指令代码" }, { status: 400 });
  }

  const valid = await verifyAccessCode(code);
  if (!valid) {
    await recordLoginFailure(ip);
    // 稍作延迟，降低暴力尝试速度
    await new Promise((resolve) => setTimeout(resolve, 600));
    return Response.json({ error: "指令代码不正确" }, { status: 401 });
  }

  await clearLoginAttempts(ip);
  const token = await createAdminSession();
  const secure =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  await setSessionCookie(token, secure);

  return Response.json({ ok: true });
}