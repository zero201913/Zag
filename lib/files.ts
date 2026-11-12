import { mediaUrl } from "./utils";
import type { FileRecord } from "./types";

export type FileKind = "html" | "markdown" | "code" | "text" | "other";

const HTML_EXTENSIONS = ["html", "htm", "xhtml"];
const MARKDOWN_EXTENSIONS = ["md", "markdown", "mdx"];
const CODE_EXTENSIONS = [
  "css", "scss", "less",
  "js", "mjs", "cjs", "jsx",
  "ts", "tsx",
  "json", "jsonc",
  "java",
  "py",
  "rb",
  "go",
  "rs",
  "php",
  "swift",
  "kt", "kts",
  "c", "h", "cpp", "cc", "hpp", "cs",
  "sh", "bash", "zsh", "fish", "ps1", "bat",
  "sql",
  "xml",
  "yml", "yaml", "toml", "ini", "conf", "env",
  "vue", "svelte", "astro",
  "graphql", "gql",
  "lua", "r", "pl", "scala",
];
const TEXT_EXTENSIONS = ["txt", "text", "log", "csv", "tsv", "diff", "patch"];

/** 后台上传允许的扩展名，同时也是 public 预览页判断能否在线查看的依据。 */
export const FILE_EXTENSIONS = [
  ...HTML_EXTENSIONS,
  ...MARKDOWN_EXTENSIONS,
  ...CODE_EXTENSIONS,
  ...TEXT_EXTENSIONS,
];

const ALLOWED = new Set(FILE_EXTENSIONS);

const MIME_BY_EXT: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  xhtml: "application/xhtml+xml; charset=utf-8",
  css: "text/css; charset=utf-8",
  scss: "text/x-scss; charset=utf-8",
  less: "text/x-less; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  cjs: "text/javascript; charset=utf-8",
  jsx: "text/jsx; charset=utf-8",
  ts: "text/typescript; charset=utf-8",
  tsx: "text/tsx; charset=utf-8",
  json: "application/json; charset=utf-8",
  jsonc: "application/json; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
  mdx: "text/markdown; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  yml: "text/yaml; charset=utf-8",
  yaml: "text/yaml; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",
  java: "text/x-java-source; charset=utf-8",
  py: "text/x-python; charset=utf-8",
  php: "application/x-httpd-php; charset=utf-8",
  sql: "application/sql; charset=utf-8",
};

const LANGUAGE_BY_EXT: Record<string, string> = {
  html: "HTML",
  htm: "HTML",
  xhtml: "XHTML",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "React JSX",
  ts: "TypeScript",
  tsx: "React TSX",
  json: "JSON",
  jsonc: "JSONC",
  java: "Java",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  kts: "Kotlin",
  c: "C",
  h: "C Header",
  cpp: "C++",
  cc: "C++",
  hpp: "C++ Header",
  cs: "C#",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  fish: "Fish",
  ps1: "PowerShell",
  bat: "Batch",
  sql: "SQL",
  xml: "XML",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  ini: "INI",
  conf: "Config",
  env: "Env",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  graphql: "GraphQL",
  gql: "GraphQL",
  lua: "Lua",
  r: "R",
  pl: "Perl",
  scala: "Scala",
  md: "Markdown",
  markdown: "Markdown",
  mdx: "MDX",
  txt: "纯文本",
  text: "纯文本",
  log: "日志",
  csv: "CSV",
  tsv: "TSV",
  diff: "Diff",
  patch: "Patch",
};

const KIND_LABEL: Record<FileKind, string> = {
  html: "HTML 页面",
  markdown: "Markdown",
  code: "代码",
  text: "文本",
  other: "其他",
};

/** 在线预览最多读取 512KB，避免把巨大的日志整段塞进页面。 */
export const MAX_PREVIEW_BYTES = 512 * 1024;
/** 代码预览最多显示 1200 行，超出部分提示下载查看。 */
export const MAX_PREVIEW_LINES = 1200;

export function extOf(name: string): string {
  const clean = (name || "").split(/[?#]/)[0];
  const index = clean.lastIndexOf(".");
  if (index <= 0 || index === clean.length - 1) return "";
  return clean.slice(index + 1).toLowerCase();
}

export function isAllowedFileExt(ext: string): boolean {
  return ALLOWED.has(ext.toLowerCase());
}

export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] || "text/plain; charset=utf-8";
}

export function languageOf(ext: string): string {
  return LANGUAGE_BY_EXT[ext.toLowerCase()] || "文本";
}

export function fileKindOf(ext: string): FileKind {
  const value = ext.toLowerCase();
  if (HTML_EXTENSIONS.includes(value)) return "html";
  if (MARKDOWN_EXTENSIONS.includes(value)) return "markdown";
  if (CODE_EXTENSIONS.includes(value)) return "code";
  if (TEXT_EXTENSIONS.includes(value)) return "text";
  return "other";
}

export function kindLabel(kind: FileKind): string {
  return KIND_LABEL[kind];
}

export function kindLabelOf(ext: string): string {
  return KIND_LABEL[fileKindOf(ext)];
}

/** 去掉扩展名，作为默认标题。 */
export function baseNameOf(name: string): string {
  const clean = (name || "").split(/[\\/]/).pop() ?? "";
  const index = clean.lastIndexOf(".");
  return index > 0 ? clean.slice(0, index) : clean;
}

export function filePath(file: Pick<FileRecord, "id">): string {
  return `/files/${encodeURIComponent(file.id)}`;
}

export function fileDownloadUrl(file: Pick<FileRecord, "r2_key">): string {
  return `${mediaUrl(file.r2_key)}?download=1`;
}

export function filePreviewRawUrl(file: Pick<FileRecord, "r2_key">): string {
  return `${mediaUrl(file.r2_key)}?preview=1`;
}

export function fileMarkdownSnippet(file: Pick<FileRecord, "id" | "title">): string {
  return `[${file.title || "文件"}](${filePath(file)})`;
}

export function fileHtmlSnippet(file: Pick<FileRecord, "id" | "title">): string {
  return `<a href="${filePath(file)}" target="_blank" rel="noopener">${file.title || "文件"}</a>`;
}

/** 下载链接在文章里最实用：直接指向原文件。 */
export function fileDownloadSnippet(file: Pick<FileRecord, "r2_key">): string {
  return `[下载原文件](${fileDownloadUrl(file)})`;
}