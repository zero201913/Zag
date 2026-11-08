"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * 桌面端平滑滚动。触屏保持系统原生滚动（syncTouch: false），
 * 后台页面和开启“减少动态效果”的用户不启用。
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const isAdmin = (pathname ?? "").startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
      anchors: true,
    });

    return () => lenis.destroy();
  }, [isAdmin]);

  return null;
}