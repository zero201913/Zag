export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

/** 去掉标题里的 Markdown 标记，得到用于目录展示和生成锚点的纯文本。 */
export function cleanHeadingText(raw: string) {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 生成稳定、可读的标题锚点；重复标题自动追加序号。 */
export function nextHeadingId(text: string, used: Set<string>) {
  const base =
    text
      .toLocaleLowerCase()
      .replace(/['"“”‘’]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section";

  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

/**
 * 从 Markdown 源文本提取 h1-h4 标题。
 * 跳过代码块里的 # 行，避免把示例代码当成目录项。
 */
export function extractToc(source: string): TocHeading[] {
  if (!source) return [];

  const headings: TocHeading[] = [];
  const used = new Set<string>();
  let fence: string | null = null;

  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;

    const match = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const text = cleanHeadingText(match[2]);
    if (!text) continue;

    headings.push({
      id: nextHeadingId(text, used),
      text,
      depth: match[1].length,
    });
  }

  return headings;
}