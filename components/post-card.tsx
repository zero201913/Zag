import Link from "next/link";
import type { PostSummary } from "@/lib/types";
import { formatDate, mediaUrl, parseTags } from "@/lib/utils";
import { Icon } from "./icons";

export function PostCard({ post, index = 0 }: { post: PostSummary; index?: number }) {
  const tags = parseTags(post.tags);
  return (
    <Link
      href={`/posts/${encodeURIComponent(post.slug)}`}
      className="glass card card-hover post-card reveal"
      style={{ ["--i" as string]: index }}
    >
      <div className="post-cover">
        {post.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(post.cover_url)} alt={post.title} loading="lazy" />
        ) : (
          <div className="cover-mono">
            <span className="cover-letter">{post.title.slice(0, 1)}</span>
            <span className="cover-label">ZAG · {tags[0] ?? "JOURNAL"}</span>
          </div>
        )}
        {post.featured === 1 && (
          <span className="chip chip-accent absolute left-3 top-3 backdrop-blur-md">精选</span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 text-[0.7rem] text-muted">
          <span>{formatDate(post.created_at)}</span>
          {tags[0] && (
            <>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>{tags[0]}</span>
            </>
          )}
        </div>
        <h3 className="mt-2 text-[1.06rem] font-semibold leading-snug tracking-[-0.02em]">
          {post.title}
        </h3>
        <p className="clip-2 mt-2 text-[0.84rem] leading-relaxed text-muted">
          {post.excerpt}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
          阅读全文
          <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </Link>
  );
}