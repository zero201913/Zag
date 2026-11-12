import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { PostCard } from "@/components/post-card";
import { PostToc } from "@/components/post-toc";
import { getPostBySlug, listPosts } from "@/lib/db";
import { extractToc } from "@/lib/toc";
import { formatDate, mediaUrl, parseTags, readingTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return { title: "文章未找到" };
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        images: post.cover_url ? [mediaUrl(post.cover_url)] : undefined,
      },
    };
  } catch {
    return { title: "文章" };
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));
  if (!post) notFound();

  const tags = parseTags(post.tags);
  const toc = extractToc(post.content);
  const related = (await listPosts({ limit: 4 })).filter((item) => item.id !== post.id).slice(0, 3);

  return (
    <div className={`page-wrap post-page-wrap${toc.length ? "" : " post-page-wrap-solo"}`}>
      <Link href="/posts" className="btn btn-ghost -ml-2 mb-6">
        <Icon name="arrow-left" size={15} />
        返回文章
      </Link>

      <div className={`post-layout${toc.length ? " has-toc" : ""}`}>
        <div className="post-main">
          <article className="reveal">
            <header className="glass rounded-[32px] p-7 sm:p-10">
              <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-muted">
                <span className="chip chip-accent">
                  <Icon name="file" size={12} />
                  Journal
                </span>
                <span>{formatDate(post.created_at)}</span>
                <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                <span>{readingTime(post.content)}</span>
                {post.updated_at > post.created_at && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                    <span>更新于 {formatDate(post.updated_at)}</span>
                  </>
                )}
              </div>

              <h1 className="display mt-4 text-[clamp(1.9rem,4.6vw,3.1rem)] balance">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
                  {post.excerpt}
                </p>
              )}

              {tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link key={tag} href={`/posts?tag=${encodeURIComponent(tag)}`} className="chip">
                      <Icon name="tag" size={12} />
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            {post.cover_url && (
              <div className="mt-4 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-2)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(post.cover_url)}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[520px] w-full object-cover"
                />
              </div>
            )}

            <div id="post-content" className="glass post-body mt-4 rounded-[32px] p-7 sm:p-10">
              <Markdown content={post.content} />
            </div>

            <footer className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon name="sparkles" size={14} />
                </span>
                感谢读到这里，下一篇见。
              </div>
              <Link href="/posts" className="btn">
                更多文章
                <Icon name="arrow-right" size={15} />
              </Link>
            </footer>
          </article>

          {related.length > 0 && (
            <section className="mt-14">
              <h2 className="section-title mb-5">继续阅读</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item, index) => (
                  <PostCard key={item.id} post={item} index={index} />
                ))}
              </div>
            </section>
          )}
        </div>

        {toc.length > 0 && <PostToc headings={toc} />}
      </div>
    </div>
  );
}