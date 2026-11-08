"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SearchHit } from "@/lib/types";
import { Icon, type IconName } from "./icons";

const TYPE_META: Record<SearchHit["type"], { label: string; icon: IconName }> = {
  post: { label: "文章", icon: "file" },
  project: { label: "项目", icon: "folder" },
  bookmark: { label: "收藏", icon: "bookmark" },
  photo: { label: "照片", icon: "image" },
  track: { label: "音乐", icon: "music" },
};

const QUICK_LINKS = [
  { href: "/posts", label: "浏览全部文章", icon: "file" as IconName },
  { href: "/bookmarks", label: "打开收藏夹", icon: "bookmark" as IconName },
  { href: "/photos", label: "看看照片", icon: "image" as IconName },
  { href: "/music", label: "播放音乐", icon: "music" as IconName },
];

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    setSelected(0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: SearchHit[] };
        setResults(data.results ?? []);
        setSelected(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 170);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      } else if (event.key === "Enter") {
        const hit = results[selected];
        if (hit) {
          event.preventDefault();
          onClose();
          router.push(hit.href);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, onClose, router]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="search-panel glass-strong" role="dialog" aria-modal="true" aria-label="快捷搜索">
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
          <Icon name="search" size={19} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="按标题搜索文章、项目、收藏、照片、音乐…"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="chip shrink-0" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="max-h-[54vh] overflow-y-auto p-2" data-lenis-prevent>
          {!query.trim() && (
            <div className="p-2">
              <p className="px-2 pb-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted">快速前往</p>
              <div className="grid gap-1">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="search-result"
                    onClick={onClose}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon name={item.icon} size={17} />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                    <Icon name="arrow-right" size={15} className="ml-auto text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted">
              <Icon name="loader" size={16} className="animate-spin" />
              正在搜索…
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium">没有找到「{query}」</p>
              <p className="mt-1 text-xs text-muted">换个关键词试试，或者去文章页慢慢翻。</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid gap-1">
              {results.map((hit, index) => {
                const meta = TYPE_META[hit.type];
                return (
                  <Link
                    key={`${hit.type}-${hit.id}`}
                    href={hit.href}
                    className="search-result"
                    data-selected={index === selected}
                    onMouseEnter={() => setSelected(index)}
                    onClick={onClose}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon name={meta.icon} size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{hit.title}</span>
                      {hit.subtitle && (
                        <span className="block truncate text-xs text-muted">{hit.subtitle}</span>
                      )}
                    </span>
                    <span className="chip shrink-0">{meta.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] text-[0.68rem] text-muted">
          <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
          <span>{results.length > 0 ? `${results.length} 个结果` : "Zag Search"}</span>
        </div>
      </div>
    </>
  );
}