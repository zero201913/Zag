"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AppearanceTrigger } from "./appearance-trigger";
import { Icon } from "./icons";
import { LinkPending } from "./link-pending";
import { ThemeToggle } from "./theme-toggle";

// 搜索面板只在打开时才加载，减小首屏 JS
const SearchDialog = dynamic(
  () => import("./search-dialog").then((module) => module.SearchDialog),
  { ssr: false },
);

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const brandClicks = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
        return;
      }
      if (!typing && !event.metaKey && !event.ctrlKey && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleBrandClick() {
    const state = brandClicks.current;
    state.count += 1;
    if (state.timer) window.clearTimeout(state.timer);
    if (state.count >= 5) {
      state.count = 0;
      state.timer = null;
      router.push("/admin/login");
      return;
    }
    state.timer = window.setTimeout(() => {
      state.count = 0;
      state.timer = null;
    }, 1800);
  }

  return (
    <>
      <header className="site-header">
        <div className="nav-shell glass">
          <Link
            href="/"
            className="brand"
            onClick={handleBrandClick}
            aria-label={`${SITE.name} 首页`}
          >
            <span className="brand-orb" />
            <span>
              {SITE.name}
              <span className="text-[var(--accent-3)]">.</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                prefetch
                data-active={isActive(item.href)}
              >
                {item.label}
                <LinkPending />
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 min-[900px]:ml-0">
            <AppearanceTrigger />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="搜索"
              title="搜索（Ctrl / ⌘ + K）"
            >
              <Icon name="search" size={17} />
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="icon-btn menu-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "close" : "menu"} size={18} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mx-auto mt-2 max-w-[1180px] min-[900px]:hidden">
            <nav className="glass-strong grid gap-1 rounded-3xl p-2.5" aria-label="移动导航">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("nav-link !rounded-2xl !px-4 !py-3", isActive(item.href) && "!bg-[var(--accent-soft)] !text-[var(--accent)]")}
                  prefetch
                  data-active={false}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  <span className="ml-2 text-[0.66rem] uppercase tracking-[0.12em] opacity-50">
                    {item.en}
                  </span>
                  <LinkPending />
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}