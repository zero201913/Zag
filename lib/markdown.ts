import { Marked, type Tokens } from "marked";
import { cleanHeadingText, nextHeadingId } from "./toc";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function safeUrl(raw: string, allowMail = true) {
  const value = (raw || "").trim();
  if (!value) return "#";
  if (value.startsWith("/") || value.startsWith("#")) return value;
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
    return allowMail || !/^mailto:/i.test(value) ? value : "#";
  }
  return "#";
}

/**
 * 每次渲染创建独立实例：标题锚点需要按当前文章重新去重，
 * 避免并发渲染的不同文章互相污染。
 */
function createMarked(headingIds: Set<string>) {
  const instance = new Marked({
    gfm: true,
    breaks: true,
  });

  instance.use({
    renderer: {
      heading(token: Tokens.Heading) {
        const body = this.parser.parseInline(token.tokens);
        if (token.depth > 4) return `<h${token.depth}>${body}</h${token.depth}>`;
        const id = nextHeadingId(cleanHeadingText(token.text), headingIds);
        return `<h${token.depth} id="${escapeAttr(id)}">${body}</h${token.depth}>`;
      },
      link(token: Tokens.Link) {
        const href = escapeAttr(safeUrl(token.href));
        const title = token.title ? ` title="${escapeAttr(token.title)}"` : "";
        const text = this.parser.parseInline(token.tokens);
        const external = /^https?:\/\//i.test(token.href);
        return `<a href="${href}"${title}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
      },
      image(token: Tokens.Image) {
        const src = escapeAttr(safeUrl(token.href, false));
        const alt = escapeAttr(token.text || "");
        const title = token.title ? ` title="${escapeAttr(token.title)}"` : "";
        return `<img src="${src}" alt="${alt}"${title} loading="lazy" decoding="async" />`;
      },
    },
  });

  return instance;
}

/**
 * 渲染 Markdown。先把源文本里的 HTML 全部转义，再交给 marked，
 * 这样即使文章里写了 <script> 也只会作为文字显示。
 */
export function renderMarkdown(source: string) {
  if (!source) return "";
  const html = createMarked(new Set<string>()).parse(escapeHtml(source), { async: false }) as string;
  return html;
}