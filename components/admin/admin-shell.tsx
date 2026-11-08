"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../icons";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/admin", label: "概览", icon: "grid" },
  { href: "/admin/posts", label: "文章", icon: "file" },
  { href: "/admin/notes", label: "说说", icon: "message" },
  { href: "/admin/projects", label: "项目", icon: "folder" },
  { href: "/admin/bookmarks", label: "收藏夹", icon: "bookmark" },
  { href: "/admin/photos", label: "照片", icon: "image" },
  { href: "/admin/backgrounds", label: "背景", icon: "palette" },
  { href: "/admin/music", label: "音乐", icon: "music" },
  { href: "/admin/settings", label: "设置", icon: "settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const nav = (
    <nav className="grid gap-1" aria-label="后台导航">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="admin-link"
          data-active={isActive(item.href)}
          onClick={() => setMobileOpen(false)}
        >
          <Icon name={item.icon} size={17} />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-[80vh]">
      <div className="px-4 pt-4 lg:hidden">
        <div className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3">
          <Link href="/admin" className="brand !text-base">
            <span className="brand-orb !h-7 !w-7" />
            Zag Admin
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="icon-btn" aria-label="查看站点">
              <Icon name="external" size={16} />
            </Link>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="切换后台菜单"
            >
              <Icon name={mobileOpen ? "close" : "menu"} size={18} />
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="glass mt-2 rounded-2xl p-2">
            {nav}
            <div className="divider my-2" />
            <button
              type="button"
              className="admin-link w-full"
              onClick={logout}
              disabled={loggingOut}
            >
              <Icon name="logout" size={17} />
              {loggingOut ? "正在退出…" : "退出登录"}
            </button>
          </div>
        )}
      </div>

      <div className="admin-shell">
        <aside className="admin-sidebar glass hidden flex-col lg:flex">
          <Link href="/admin" className="brand px-2 py-1">
            <span className="brand-orb" />
            <span>
              Zag<span className="text-[var(--accent-3)]">.</span>
            </span>
          </Link>
          <div className="mt-1 flex items-center gap-2 px-2">
            <span className="chip chip-accent !text-[0.62rem]">ADMIN</span>
            <span className="text-[0.66rem] text-muted">内容管理后台</span>
          </div>

          <div className="divider my-4" />

          {nav}

          <div className="divider my-4" />

          <div className="grid gap-1">
            <Link href="/" className="admin-link" target="_blank">
              <Icon name="external" size={17} />
              查看站点
            </Link>
            <button
              type="button"
              className="admin-link w-full text-left"
              onClick={logout}
              disabled={loggingOut}
            >
              <Icon name="logout" size={17} />
              {loggingOut ? "正在退出…" : "退出登录"}
            </button>
          </div>

          <div className="mt-auto pt-6">
            <div className="glass-soft rounded-2xl p-3">
              <div className="flex items-center gap-2 text-[0.7rem] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-3)]" />
                D1 + R2 · 已连接
              </div>
              <p className="mt-1.5 text-[0.66rem] leading-relaxed text-muted">
                上传的文件直接写入 R2，内容写入 D1。
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}