import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Icon, type IconName } from "@/components/icons";
import {
  getAdminStats,
  getSettings,
  listAdminPosts,
  listPhotos,
  listTracks,
} from "@/lib/db";
import { formatDate, formatDuration, mediaUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, posts, photos, tracks, settings] = await Promise.all([
    getAdminStats(),
    listAdminPosts(),
    listPhotos(),
    listTracks(),
    getSettings(),
  ]);

  const recent = posts.slice(0, 6);

  const cards: Array<{ label: string; value: number; icon: IconName; href: string; note: string }> = [
    { label: "文章", value: stats.posts, icon: "file", href: "/admin/posts", note: `${stats.drafts} 篇草稿` },
    { label: "说说", value: stats.notes, icon: "message", href: "/admin/notes", note: "短句与碎片" },
    { label: "项目", value: stats.projects, icon: "folder", href: "/admin/projects", note: "链接与作品" },
    { label: "收藏", value: stats.bookmarks, icon: "bookmark", href: "/admin/bookmarks", note: "分类收纳" },
    { label: "照片", value: stats.photos, icon: "image", href: "/admin/photos", note: "存放在 R2" },
    { label: "音乐", value: stats.tracks, icon: "music", href: "/admin/music", note: "存放在 R2" },
  ];

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="内容概览"
        description="所有内容都实时来自 Cloudflare D1，文件来自 R2。"
        action={
          <Link href="/" target="_blank" className="btn">
            <Icon name="external" size={15} />
            查看站点
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card, index) => (
          <Link
            key={card.label}
            href={card.href}
            className="glass card card-hover reveal !p-5"
            style={{ ["--i" as string]: index }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name={card.icon} size={17} />
              </span>
              <Icon name="arrow-up-right" size={14} className="text-muted" />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">{card.value}</p>
            <p className="text-[0.78rem] font-medium">{card.label}</p>
            <p className="mt-0.5 text-[0.66rem] text-muted">{card.note}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="glass rounded-[26px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">最近文章</h2>
              <p className="text-xs text-muted">按创建时间排序，含草稿</p>
            </div>
            <Link href="/admin/posts" className="btn btn-ghost !px-3 !py-1.5 !text-xs">
              管理文章
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>

          {recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>状态</th>
                    <th>日期</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((post) => (
                    <tr key={post.id}>
                      <td>
                        {post.status === "published" ? (
                          <Link
                            href={`/posts/${encodeURIComponent(post.slug)}`}
                            target="_blank"
                            className="font-medium hover:text-[var(--accent)]"
                          >
                            {post.title}
                          </Link>
                        ) : (
                          <span className="font-medium">{post.title}</span>
                        )}
                      </td>
                      <td>
                        <span className={post.status === "published" ? "chip chip-accent" : "chip"}>
                          {post.status === "published" ? "已发布" : "草稿"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {formatDate(post.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted">还没有文章。</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-[26px] p-5">
            <h2 className="text-base font-semibold">快速操作</h2>
            <div className="mt-3 grid gap-2">
              <QuickLink href="/admin/posts" icon="pencil" label="写一篇文章" />
              <QuickLink href="/admin/notes" icon="message" label="写一条说说" />
              <QuickLink href="/admin/photos" icon="image" label="上传照片" />
              <QuickLink href="/admin/backgrounds" icon="palette" label="管理背景" />
              <QuickLink href="/admin/music" icon="music" label="上传音乐" />
              <QuickLink href="/admin/settings" icon="settings" label="修改站点文案" />
            </div>
          </div>

          <div className="glass rounded-[26px] p-5">
            <h2 className="text-base font-semibold">存储状态</h2>
            <div className="mt-3 space-y-2.5 text-xs">
              <StatusRow icon="database" label="D1 · SQLite" value="已连接" />
              <StatusRow icon="cloud" label="R2 · 对象存储" value="已连接" />
              <StatusRow icon="image" label="媒体文件" value={`${photos.length} 张 · ${tracks.length} 首`} />
            </div>
            <div className="divider my-3" />
            <p className="text-[0.68rem] leading-relaxed text-muted">
              进入指令：已启用{settings.admin_code_hash ? "（自定义）" : "（环境变量）"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-[26px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">最近照片</h2>
            <Link href="/admin/photos" className="text-xs text-[var(--accent)]">
              管理
            </Link>
          </div>
          {photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(0, 8).map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(photo.r2_key)}
                    alt={photo.title || "照片"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted">还没有照片。</p>
          )}
        </div>

        <div className="glass rounded-[26px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">最近音乐</h2>
            <Link href="/admin/music" className="text-xs text-[var(--accent)]">
              管理
            </Link>
          </div>
          {tracks.length > 0 ? (
            <div className="space-y-1">
              {tracks.slice(0, 5).map((track) => (
                <div key={track.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon name="music" size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{track.title}</span>
                    <span className="block truncate text-[0.68rem] text-muted">
                      {track.artist || "未知艺术家"}
                    </span>
                  </span>
                  <span className="font-mono text-[0.66rem] text-muted">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted">还没有音乐。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="glass-soft flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-[var(--accent-soft)]"
    >
      <Icon name={icon} size={15} className="text-[var(--accent)]" />
      {label}
      <Icon name="arrow-right" size={13} className="ml-auto text-muted" />
    </Link>
  );
}

function StatusRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={icon} size={14} className="text-[var(--accent)]" />
      <span className="text-muted">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}