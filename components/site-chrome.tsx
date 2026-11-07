"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

/**
 * 公共站点页头/页脚只在非 /admin 路由显示，
 * 后台使用自己的侧边栏布局。
 */
export function SiteChrome({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = (pathname ?? "").startsWith("/admin");

  if (isAdmin) {
    return <main className="relative z-10">{children}</main>;
  }

  return (
    <>
      <SiteHeader />
      <main className="relative z-10">{children}</main>
      {footer}
    </>
  );
}