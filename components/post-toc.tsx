"use client";

import { useEffect, useMemo, useState } from "react";
import type { TocHeading } from "@/lib/toc";

export function PostToc({
  headings,
  contentId = "post-content",
}: {
  headings: TocHeading[];
  contentId?: string;
}) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const [progress, setProgress] = useState(0);

  const levels = useMemo(() => {
    if (!headings.length) return [];
    const minDepth = Math.min(...headings.map((heading) => heading.depth));
    return headings.map((heading) => Math.min(3, Math.max(1, heading.depth - minDepth + 1)));
  }, [headings]);

  useEffect(() => {
    setActiveId(headings[0]?.id ?? "");
  }, [headings]);

  useEffect(() => {
    const content = document.getElementById(contentId);
    if (!content || !headings.length) return;

    let frame = 0;

    const update = () => {
      frame = 0;

      const elements = headings
        .map((heading) => document.getElementById(heading.id))
        .filter((element): element is HTMLElement => Boolean(element));

      if (elements.length) {
        const threshold = Math.min(220, window.innerHeight * 0.28);
        let current = elements[0].id;
        for (const element of elements) {
          if (element.getBoundingClientRect().top <= threshold) current = element.id;
          else break;
        }
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
          current = elements[elements.length - 1].id;
        }
        setActiveId((previous) => (previous === current ? previous : current));
      }

      // 以视口上方 25% 处作为“阅读线”：正文越短，越不会在刚读开头时就跳到 100%。
      const rect = content.getBoundingClientRect();
      const passed = Math.max(0, window.innerHeight * 0.25 - rect.top);
      const total = Math.max(1, rect.height);
      const next = Math.min(100, Math.max(0, (passed / total) * 100));
      setProgress((previous) => (Math.abs(previous - next) < 0.4 ? previous : next));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings, contentId]);

  return (
    <aside className="post-toc" aria-label="文章目录">
      <div className="post-toc-card glass">
        <div className="post-toc-head">
          <span className="post-toc-title">目录</span>
          <span className="post-toc-sub">On this page</span>
        </div>

        <nav className="post-toc-nav">
          <ol>
            {headings.map((heading, index) => {
              const active = heading.id === activeId;
              return (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    className={`post-toc-item level-${levels[index]}${active ? " is-active" : ""}`}
                    aria-current={active ? "location" : undefined}
                    title={heading.text}
                  >
                    {heading.text}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="post-toc-progress">
          <div className="post-toc-progress-row">
            <span>阅读进度</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="post-toc-progress-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}