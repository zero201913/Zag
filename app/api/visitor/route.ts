import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface Visitor {
  ip: string;
  city: string;
  region: string;
  country: string;
  timezone: string;
}

/**
 * 读取 Cloudflare 提供的访客网络信息。
 * `cf.city / cf.region / cf.country` 来自 Workers 的 request.cf，
 * 比需要额外开启 Managed Transform 的 cf-ipcity 头更可靠；
 * 本地开发时拿不到 cf，返回空字段，由前端降级为“本地预览”。
 */
export async function GET() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const visitor: Visitor = {
    ip:
      headerList.get("cf-connecting-ip") ??
      forwarded?.split(",")[0]?.trim() ??
      "",
    city: "",
    region: "",
    country: "",
    timezone: "",
  };

  try {
    const { cf } = await getCloudflareContext({ async: true });
    if (cf) {
      visitor.city = cf.city ?? "";
      visitor.region = cf.region ?? "";
      visitor.country = cf.country ?? "";
      visitor.timezone = cf.timezone ?? "";
    }
  } catch {
    // 本地 next dev 没有 Cloudflare 上下文，保持空值即可
  }

  return Response.json(visitor, {
    headers: { "Cache-Control": "no-store" },
  });
}