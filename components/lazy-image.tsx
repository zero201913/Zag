"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 懒加载图片：首屏外先不发起请求，等图片距离视口 220px 以内才设置 src。
 *
 * 不直接用浏览器原生 loading="lazy" 的原因：Chrome 的懒加载阈值是 1250px，
 * 长相册页会在首屏时同时拉十几张大图，把带宽从首屏关键图（LCP）手里抢走。
 * 这里把阈值收紧到 220px，并统一用低优先级加载首屏外的图片。
 */
export function LazyImage({
  src,
  alt,
  priority = false,
  className,
  onLoad,
  ...rest
}: Omit<React.ComponentPropsWithoutRef<"img">, "src" | "loading" | "fetchPriority"> & {
  src: string;
  /** 首屏关键图：立即加载，高优先级，不加淡入（避免拖慢 LCP） */
  priority?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [near, setNear] = useState(priority);
  const [loaded, setLoaded] = useState(priority);

  useEffect(() => {
    if (near) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "220px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  return (
    <img
      ref={ref}
      src={near ? src : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "low"}
      decoding="async"
      className={[priority ? "" : "lazy-img", loaded ? "is-loaded" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      {...rest}
    />
  );
}