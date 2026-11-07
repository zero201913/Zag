import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// 让 `next dev` 也能拿到 D1 / R2 绑定（本地模拟数据在 .wrangler/state）
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // 图片来自 R2，通过 /api/media 输出，不使用 Next 图片优化服务
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
};

export default nextConfig;