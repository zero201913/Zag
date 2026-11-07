import Link from "next/link";
import { NAV_ITEMS, SITE, DEFAULT_SETTINGS } from "@/lib/site";
import { getSettings } from "@/lib/db";
import { Icon } from "./icons";

export async function SiteFooter() {
  let settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  try {
    settings = await getSettings();
  } catch {
    // 构建期或数据库暂不可用时使用默认文案
  }

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer relative z-10 px-5 pb-8 pt-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="glass rounded-[30px] p-7 sm:p-9">
          <div className="grid gap-9 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Link href="/" className="brand">
                <span className="brand-orb" />
                <span>
                  {SITE.name}
                  <span className="text-[var(--accent-3)]">.</span>
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                {settings.footer_tagline}
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  className="icon-btn"
                  href={settings.github_url || "https://github.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <Icon name="github" size={17} />
                </a>
                <a
                  className="icon-btn"
                  href={`mailto:${settings.email || "hello@example.com"}`}
                  aria-label="邮箱"
                >
                  <Icon name="mail" size={17} />
                </a>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                目录
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="w-fit text-muted transition-colors hover:text-[var(--text)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                关于这个站
              </p>
              <p className="text-sm leading-relaxed text-muted">
                Next.js 运行在 Cloudflare Workers，文章存进 D1，照片与音乐放在 R2。
              </p>
              <p className="mt-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-3)]" />
                  在线 · 玻璃与光
                </span>
              </p>
            </div>
          </div>

          <div className="divider my-6" />

          <div className="flex flex-col items-start justify-between gap-2 text-xs text-muted sm:flex-row sm:items-center">
            <span>
              © {year} {SITE.name}. 保留所有热爱。
            </span>
            <span className="font-mono text-[0.68rem]">
              D1 · R2 · Workers · Glassmorphism
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}