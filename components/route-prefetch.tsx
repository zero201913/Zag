"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const HOVER_DELAY = 120;

/**
 * 意图预取：链接不在进入视口时预取（那会在首屏一次触发十几个 Worker 渲染），
 * 而是等指针悬停 / 键盘聚焦 / 手指按下 120ms 之后再预取。
 *
 * 配合各处的 prefetch={false} 使用，效果是「首屏零预取，真要点了才取」。
 */
export function RoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    const done = new Set<string>();
    const timers = new Map<Element, number>();

    function hrefOf(event: Event): string | null {
      const target = event.target;
      if (!(target instanceof Element)) return null;
      const anchor = target.closest("a[href]");
      if (!anchor || !anchor.getAttribute("href")) return null;
      if (anchor.hasAttribute("download")) return null;
      if (anchor.getAttribute("target") === "_blank") return null;

      const url = new URL(anchor.getAttribute("href") ?? "", window.location.href);
      if (url.origin !== window.location.origin) return null;
      if (/^\/(admin|api)(\/|$)/.test(url.pathname)) return null;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return null;
      }
      return `${url.pathname}${url.search}`;
    }

    function schedule(event: Event) {
      const href = hrefOf(event);
      if (!href || done.has(href)) return;
      const anchor =
        event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      if (timers.has(anchor)) return;

      const timer = window.setTimeout(() => {
        timers.delete(anchor);
        if (done.has(href)) return;
        done.add(href);
        router.prefetch(href);
      }, HOVER_DELAY);
      timers.set(anchor, timer);
    }

    function cancel(event: Event) {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      const timer = timers.get(anchor);
      if (timer === undefined) return;
      window.clearTimeout(timer);
      timers.delete(anchor);
    }

    // pointerover 同时覆盖鼠标与触屏，focusin 覆盖键盘 Tab
    window.addEventListener("pointerover", schedule, { passive: true });
    window.addEventListener("pointerout", cancel, { passive: true });
    window.addEventListener("focusin", schedule, { passive: true });
    window.addEventListener("touchstart", schedule, { passive: true });

    return () => {
      window.removeEventListener("pointerover", schedule);
      window.removeEventListener("pointerout", cancel);
      window.removeEventListener("focusin", schedule);
      window.removeEventListener("touchstart", schedule);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, [router]);

  return null;
}