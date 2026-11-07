import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { listBookmarks } from "@/lib/db";
import type { Bookmark } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "收藏夹" };

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function BookmarksPage() {
  const bookmarks = await listBookmarks();
  const groups = new Map<string, Bookmark[]>();
  for (const bookmark of bookmarks) {
    const list = groups.get(bookmark.category) ?? [];
    list.push(bookmark);
    groups.set(bookmark.category, list);
  }

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Bookmarks · 收藏夹"
        title="值得反复打开的地方"
        description="开发文档、设计灵感、偶尔摸鱼用的网站。按分类收好，随时回来。"
        right={
          <span className="chip">
            <Icon name="bookmark" size={13} />
            {bookmarks.length} 个收藏
          </span>
        }
      />

      {bookmarks.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="收藏夹还是空的"
          description="去后台添加第一个值得收藏的网站。"
          actionHref="/admin"
          actionLabel="进入后台"
        />
      ) : (
        <div className="space-y-10">
          {Array.from(groups.entries()).map(([category, items], groupIndex) => (
            <section key={category} className="reveal" style={{ ["--i" as string]: groupIndex }}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="section-title text-xl">{category}</h2>
                <span className="chip">{items.length}</span>
                <div className="divider flex-1" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((bookmark) => (
                  <a
                    key={bookmark.id}
                    id={`bookmark-${bookmark.id}`}
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass card card-hover group flex flex-col gap-3 !p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                        <Icon name="bookmark" size={18} />
                      </span>
                      <Icon
                        name="arrow-up-right"
                        size={16}
                        className="text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <h3 className="text-[0.98rem] font-semibold leading-snug">{bookmark.title}</h3>
                      <p className="mt-1 text-[0.68rem] font-mono text-[var(--accent)]">
                        {hostOf(bookmark.url)}
                      </p>
                      {bookmark.description && (
                        <p className="clip-2 mt-2 text-[0.8rem] leading-relaxed text-muted">
                          {bookmark.description}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}