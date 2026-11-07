import { Icon, type IconName } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { PageHeading } from "@/components/page-heading";
import { getSettings, getStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "关于" };

const STACK: Array<{ icon: IconName; name: string; desc: string }> = [
  { icon: "code", name: "Next.js 16", desc: "App Router · Server Components" },
  { icon: "database", name: "Cloudflare D1", desc: "SQLite 内容数据库" },
  { icon: "cloud", name: "Cloudflare R2", desc: "图片与音频对象存储" },
  { icon: "sparkles", name: "Glassmorphism", desc: "玻璃拟态视觉系统" },
];

export default async function AboutPage() {
  const [settings, stats] = await Promise.all([getSettings(), getStats()]);

  return (
    <div className="page-wrap page-wrap-narrow">
      <PageHeading
        eyebrow="About · 关于"
        title="关于我，和这块玻璃"
        description="一个喜欢写代码、做设计、拍照和听歌的人，搭给自己的数字花园。"
      />

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="glass reveal relative overflow-hidden rounded-[30px] p-7">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[linear-gradient(140deg,var(--accent),var(--accent-2)_60%,var(--accent-3))] text-4xl font-extrabold text-white shadow-[0_20px_50px_-20px_var(--accent)]">
                Z
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">Zag</h2>
              <p className="mt-1 text-sm text-muted">Developer · Designer · 偶尔拍照</p>

              <div className="divider my-5" />

              <div className="grid grid-cols-2 gap-4">
                <div className="metric">
                  <span className="metric-value">{stats.posts}</span>
                  <span className="metric-label">文章</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{stats.projects}</span>
                  <span className="metric-label">项目</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{stats.photos}</span>
                  <span className="metric-label">照片</span>
                </div>
                <div className="metric">
                  <span className="metric-value">{stats.tracks}</span>
                  <span className="metric-label">音乐</span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={settings.github_url || "https://github.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  <Icon name="github" size={15} />
                  GitHub
                </a>
                <a href={`mailto:${settings.email}`} className="btn">
                  <Icon name="mail" size={15} />
                  邮箱
                </a>
              </div>
            </div>
          </div>

          <div className="glass-soft reveal rounded-[26px] p-6" style={{ ["--i" as string]: 1 }}>
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              Colophon
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              这个站没有复杂的 CMS。文章、项目、收藏、照片和音乐都通过一个专属后台管理，
              数据落在 D1，文件落在 R2，页面运行在 Cloudflare Workers 上。
            </p>
          </div>
        </div>

        <div className="glass reveal rounded-[30px] p-7 sm:p-9" style={{ ["--i" as string]: 1 }}>
          <Markdown content={settings.about_content} />
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-5">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Stack
          </span>
          <h2 className="section-title mt-2">这个站是怎么搭的</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((item, index) => (
            <div
              key={item.name}
              className="glass card reveal !p-5"
              style={{ ["--i" as string]: index }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name={item.icon} size={18} />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{item.name}</h3>
              <p className="mt-1 text-[0.72rem] text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}