import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { PostCard } from "@/components/post-card";
import { listPosts } from "@/lib/db";
import { parseTags } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "文章" };

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [posts, allPosts] = await Promise.all([
    listPosts({ tag, limit: 100 }),
    listPosts({ limit: 100 }),
  ]);

  const tagCounts = new Map<string, number>();
  for (const post of allPosts) {
    for (const item of parseTags(post.tags)) {
      tagCounts.set(item, (tagCounts.get(item) ?? 0) + 1);
    }
  }
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Journal · 文章"
        title={tag ? `关于「${tag}」` : "写下来的想法"}
        description="技术笔记、设计观察和生活碎片。按标题搜索，或沿着标签慢慢翻。"
        right={
          <span className="chip">
            <Icon name="file" size={13} />
            {posts.length} 篇
          </span>
        }
      />

      {tags.length > 0 && (
        <div className="reveal mb-7 flex flex-wrap gap-2">
          <Link
            href="/posts"
            className="chip"
            style={
              !tag
                ? {
                    color: "var(--accent)",
                    borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                    background: "var(--accent-soft)",
                  }
                : undefined
            }
          >
            全部
          </Link>
          {tags.map(([name, count]) => (
            <Link
              key={name}
              href={`/posts?tag=${encodeURIComponent(name)}`}
              className="chip"
              style={
                tag === name
                  ? {
                      color: "var(--accent)",
                      borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                      background: "var(--accent-soft)",
                    }
                  : undefined
              }
            >
              {name}
              <span className="opacity-50">{count}</span>
            </Link>
          ))}
        </div>
      )}

      {posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="file"
          title={tag ? `还没有「${tag}」相关的文章` : "还没有文章"}
          description="换个标签看看，或者去后台写下第一篇。"
          actionHref="/posts"
          actionLabel="查看全部文章"
        />
      )}
    </div>
  );
}