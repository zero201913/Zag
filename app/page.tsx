import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { PostCard } from "@/components/post-card";
import {
  getSettings,
  getStats,
  listPhotos,
  listPosts,
  listTracks,
} from "@/lib/db";
import { SITE } from "@/lib/site";
import { excerptOf, formatDate, mediaUrl, parseTags } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MODULES: Array<{
  href: string;
  label: string;
  en: string;
  desc: string;
  icon: IconName;
  statKey: "bookmarks" | "projects" | "photos" | "tracks";
}> = [
  {
    href: "/bookmarks",
    label: "收藏夹",
    en: "Bookmarks",
    desc: "值得反复打开的好网站",
    icon: "bookmark",
    statKey: "bookmarks",
  },
  {
    href: "/projects",
    label: "项目",
    en: "Projects",
    desc: "正在做和做过的东西",
    icon: "folder",
    statKey: "projects",
  },
  {
    href: "/photos",
    label: "照片",
    en: "Photos",
    desc: "随手拍下的光与影",
    icon: "image",
    statKey: "photos",
  },
  {
    href: "/music",
    label: "音乐",
    en: "Music",
    desc: "写作时循环的背景音",
    icon: "music",
    statKey: "tracks",
  },
];

export default async function HomePage() {
  const [settings, stats, posts, photos, tracks] = await Promise.all([
    getSettings(),
    getStats(),
    listPosts({ limit: 4 }),
    listPhotos(),
    listTracks(),
  ]);

  const featured = posts[0];
  const recent = posts.slice(1, 4);
  const [titleA, titleB] = splitHeroTitle(settings.hero_title);

  return (
    <div className="page-wrap">
      {/* Hero */}
      <section className="hero-grid">
        <div className="glass reveal relative overflow-hidden rounded-[34px] p-7 sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
          />
          <div className="relative">
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              个人数字花园 · {new Date().getFullYear()}
            </span>

            <h1 className="display mt-5 text-[clamp(2.4rem,5.6vw,4.2rem)] balance">
              {titleA}
              {titleB && (
                <>
                  <br />
                  <span className="gradient-text">{titleB}</span>
                </>
              )}
            </h1>

            <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-muted sm:text-base">
              {settings.hero_subtitle}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/posts" className="btn btn-primary">
                开始阅读
                <Icon name="arrow-right" size={16} />
              </Link>
              <Link href="/about" className="btn">
                关于我
                <Icon name="user" size={16} />
              </Link>
              <span className="hidden items-center gap-2 text-xs text-muted sm:inline-flex">
                <Icon name="search" size={14} />
                按 <kbd className="rounded-md border border-[var(--border)] px-1.5 py-0.5 font-mono text-[0.65rem]">Ctrl K</kbd> 搜索标题
              </span>
            </div>

            <div className="divider my-7" />

            <div className="grid grid-cols-4 gap-3">
              <Stat value={stats.posts} label="文章" />
              <Stat value={stats.projects} label="项目" />
              <Stat value={stats.photos} label="照片" />
              <Stat value={stats.tracks} label="音乐" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          {featured ? (
            <Link
              href={`/posts/${encodeURIComponent(featured.slug)}`}
              className="glass card card-hover reveal relative flex-1 overflow-hidden !p-0"
              style={{ ["--i" as string]: 1 }}
            >
              <div className="post-cover !rounded-none !border-0">
                {featured.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(featured.cover_url)}
                    alt={featured.title}
                    decoding="async"
                  />
                ) : (
                  <div className="cover-mono">
                    <span className="cover-letter">{featured.title.slice(0, 1)}</span>
                    <span className="cover-label">
                      FEATURED · {parseTags(featured.tags)[0] ?? "JOURNAL"}
                    </span>
                  </div>
                )}
                <span className="chip chip-accent absolute left-4 top-4 backdrop-blur-md">
                  <Icon name="sparkles" size={12} />
                  本期推荐
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-[0.7rem] text-muted">
                  <span>{formatDate(featured.created_at)}</span>
                  {parseTags(featured.tags)[0] && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                      <span>{parseTags(featured.tags)[0]}</span>
                    </>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-semibold leading-snug tracking-[-0.02em]">
                  {featured.title}
                </h2>
                <p className="clip-2 mt-2 text-[0.84rem] leading-relaxed text-muted">
                  {featured.excerpt}
                </p>
              </div>
            </Link>
          ) : (
            <div className="glass card flex flex-1 items-center justify-center text-sm text-muted">
              还没有文章，去后台上传第一篇吧。
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <Link
              href="/photos"
              className="glass card card-hover reveal flex items-center gap-3 !p-4"
              style={{ ["--i" as string]: 2 }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="image" size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">照片</span>
                <span className="text-[0.7rem] text-muted">{stats.photos} 张光影</span>
              </span>
            </Link>
            <Link
              href="/music"
              className="glass card card-hover reveal flex items-center gap-3 !p-4"
              style={{ ["--i" as string]: 3 }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="music" size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">音乐</span>
                <span className="text-[0.7rem] text-muted">{stats.tracks} 首循环</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Explore
            </span>
            <h2 className="section-title mt-2">这里有什么</h2>
          </div>
          <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted sm:block">
            文章、灵感、影像和声音，
            <br />
            都被收进同一块玻璃里。
          </p>
        </div>

        <div className="module-grid">
          {MODULES.map((module, index) => (
            <Link
              key={module.href}
              href={module.href}
              className="module-tile glass reveal"
              style={{ ["--i" as string]: index }}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon name={module.icon} size={18} />
                </span>
                <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                  {module.en}
                </span>
              </div>
              <div className="mt-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold">{module.label}</span>
                  <span className="text-[0.7rem] text-muted">
                    {String(stats[module.statKey]).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1 text-[0.74rem] text-muted">{module.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent posts */}
      <section className="mt-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Journal
            </span>
            <h2 className="section-title mt-2">最近写下的</h2>
          </div>
          <Link href="/posts" className="btn btn-ghost">
            全部文章
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>

        {recent.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))}
          </div>
        ) : (
          <div className="glass-soft rounded-[26px] p-10 text-center text-sm text-muted">
            更多文章正在路上。
          </div>
        )}
      </section>

      {/* Photos preview */}
      {photos.length > 0 && (
        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                Gallery
              </span>
              <h2 className="section-title mt-2">最近的照片</h2>
            </div>
            <Link href="/photos" className="btn btn-ghost">
              全部照片
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {photos.slice(0, 6).map((photo, index) => (
              <Link
                key={photo.id}
                href="/photos"
                className="reveal group relative aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"
                style={{ ["--i" as string]: index }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(photo.r2_key)}
                  alt={photo.title || "照片"}
                  loading="lazy"
                  decoding="async"
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Music + about strip */}
      <section className="mt-16 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass reveal rounded-[28px] p-7">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Now
          </span>
          <h2 className="section-title mt-2">关于这个站，也关于我</h2>
          <div className="mt-3 max-h-40 overflow-hidden">
            <Markdown content={settings.about_content.split("\n").slice(0, 6).join("\n")} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/about" className="btn btn-primary">
              认识我
              <Icon name="arrow-right" size={15} />
            </Link>
            <a href={`mailto:${settings.email}`} className="btn">
              <Icon name="mail" size={15} />
              写邮件
            </a>
          </div>
        </div>

        <Link
          href="/music"
          className="glass card card-hover reveal relative overflow-hidden !p-0"
          style={{ ["--i" as string]: 1 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,var(--accent),transparent_55%),radial-gradient(100%_100%_at_100%_100%,var(--accent-2),transparent_55%)] opacity-30" />
          <div className="relative flex h-full min-h-[210px] flex-col justify-between p-7">
            <div className="flex items-center justify-between">
              <span className="eyebrow">
                <span className="eyebrow-dot" />
                Playlist
              </span>
              <Icon name="music" size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-[-0.03em]">
                {tracks[0]?.title ?? "还没有上传音乐"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {tracks[0]
                  ? `${tracks[0].artist || "未知艺术家"} · 共 ${tracks.length} 首`
                  : "去后台把喜欢的歌放进来"}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                打开播放器
                <Icon name="arrow-right" size={14} />
              </span>
            </div>
          </div>
        </Link>
      </section>

      <p className="mt-12 text-center text-[0.7rem] tracking-[0.08em] text-muted">
        {SITE.name} · {settings.footer_tagline}
      </p>
    </div>
  );
}

function splitHeroTitle(title: string): [string, string] {
  const index = title.search(/[，,。]/);
  if (index === -1) return [title, ""];
  return [title.slice(0, index + 1), title.slice(index + 1).trim()];
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="metric">
      <span className="metric-value">{String(value).padStart(2, "0")}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}