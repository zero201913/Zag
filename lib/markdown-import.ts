export interface MarkdownImportResult {
  /** 解析出的标题：frontmatter > 首个 H1 > 文件名 */
  title: string;
  /** frontmatter 里显式给出的 slug，没有则留空交给服务端生成 */
  slug: string;
  /** frontmatter 里的摘要，没有则留空由服务端截取正文 */
  excerpt: string;
  /** frontmatter 里的标签，逗号分隔 */
  tags: string;
  /** 去掉标题行后的 Markdown 正文 */
  content: string;
  /** 正文中引用的本地相对图片，导入后需要手动上传替换 */
  relativeImages: string[];
  titleSource: "frontmatter" | "heading" | "filename";
}

function unquote(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/''/g, "'");
  }
  return trimmed;
}

function splitInlineList(value: string) {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner) return [];
  return inner.split(",").map((item) => unquote(item)).filter(Boolean);
}

interface Frontmatter {
  data: Record<string, string | string[]>;
  body: string;
}

/** 解析文件开头的简单 YAML frontmatter，支持字符串、内联数组和多行数组。 */
function parseFrontmatter(text: string): Frontmatter {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0].trim() !== "---") return { data: {}, body: text };

  let end = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (/^---\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  if (end === -1) return { data: {}, body: text };

  const data: Record<string, string | string[]> = {};
  let pendingKey: string | null = null;

  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;

    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && pendingKey) {
      const key = pendingKey;
      const existing = data[key];
      const current = Array.isArray(existing) ? existing : [];
      current.push(unquote(listItem[1]));
      data[key] = current;
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) continue;

    const key = pair[1].toLowerCase();
    const raw = pair[2].trim();
    pendingKey = key;

    if (!raw) {
      data[key] = [];
    } else if (raw.startsWith("[")) {
      data[key] = splitInlineList(raw);
      pendingKey = null;
    } else {
      data[key] = unquote(raw);
      pendingKey = null;
    }
  }

  return { data, body: lines.slice(end + 1).join("\n") };
}

function stringValue(value: string | string[] | undefined) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return value.trim();
}

function listValue(value: string | string[] | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return value
    .split(/[,，]/)
    .map((item) => unquote(item))
    .filter(Boolean);
}

function headingText(line: string) {
  return line.replace(/^#+\s+/, "").replace(/\s+#+\s*$/, "").trim();
}

/**
 * 找到正文首个一级标题并把它从正文里移除。
 * 只把开头（允许前面有空行）的 H1 视为文章标题，正文中间的 H1 原样保留。
 */
function extractHeading(body: string): { title: string; content: string } | null {
  const lines = body.split("\n");
  let index = 0;
  while (index < lines.length && !lines[index].trim()) index += 1;
  if (index >= lines.length) return null;

  const line = lines[index];
  const atx = line.match(/^#\s+(.+?)\s*$/);
  if (atx) {
    const rest = lines.slice(index + 1);
    while (rest.length && !rest[0].trim()) rest.shift();
    return { title: headingText(line), content: rest.join("\n") };
  }

  const next = lines[index + 1];
  if (next && /^=+\s*$/.test(next) && line.trim()) {
    const rest = lines.slice(index + 2);
    while (rest.length && !rest[0].trim()) rest.shift();
    return { title: line.trim(), content: rest.join("\n") };
  }

  return null;
}

function titleFromFileName(fileName: string) {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const withoutExt = base.replace(/\.(md|markdown|mdown|txt)$/i, "").replace(/[-_]+/g, " ").trim();
  if (!withoutExt) return "";
  if (/^[a-z0-9 ]+$/.test(withoutExt)) {
    return withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
  }
  return withoutExt;
}

function findRelativeImages(content: string) {
  const found: string[] = [];
  const seen = new Set<string>();
  const pattern = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g;
  for (const match of content.matchAll(pattern)) {
    const src = match[1].trim();
    if (!src) continue;
    if (/^(https?:)?\/\//i.test(src)) continue;
    if (/^(data:|blob:|mailto:|#|\/)/i.test(src)) continue;
    const key = src.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(src);
  }
  return found;
}

/**
 * 把 Markdown 文件解析成文章编辑器的初始值。
 * 支持可选 frontmatter（title / slug / excerpt / description / summary / tags），
 * 没有 frontmatter 时使用首个 H1，再退回到文件名。
 */
export function parseMarkdownImport(raw: string, fileName = ""): MarkdownImportResult {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const { data, body } = parseFrontmatter(text);
  const heading = extractHeading(body);

  const frontmatterTitle = stringValue(data.title);
  let title = frontmatterTitle || heading?.title || titleFromFileName(fileName);
  title = title.trim();
  let titleSource: MarkdownImportResult["titleSource"] = frontmatterTitle
    ? "frontmatter"
    : heading?.title
      ? "heading"
      : "filename";

  if (!title) {
    title = "未命名文章";
    titleSource = "filename";
  }

  const content = (heading ? heading.content : body).replace(/^\n+/, "").trimEnd();

  return {
    title,
    slug: stringValue(data.slug),
    excerpt: stringValue(data.excerpt) || stringValue(data.description) || stringValue(data.summary),
    tags: listValue(data.tags).join(", "),
    content,
    relativeImages: findRelativeImages(content),
    titleSource,
  };
}