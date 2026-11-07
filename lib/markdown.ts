import { Marked, type Tokens } from "marked";

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

const marked = new Marked({
  gfm: true,
  breaks: true,
});

marked.use({
  renderer: {
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

/**
 * 渲染 Markdown。先把源文本里的 HTML 全部转义，再交给 marked，
 * 这样即使文章里写了 <script> 也只会作为文字显示。
 */
export function renderMarkdown(source: string) {
  if (!source) return "";
  const html = marked.parse(escapeHtml(source), { async: false }) as string;
  return html;
}