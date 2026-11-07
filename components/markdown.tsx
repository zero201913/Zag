import { renderMarkdown } from "@/lib/markdown";

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div
      className={`prose-zag ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}