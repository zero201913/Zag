import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Icon, type IconName } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { getFileById } from "@/lib/db";
import { readFilePreview } from "@/lib/file-preview";
import {
  fileDownloadUrl,
  fileKindOf,
  fileMarkdownSnippet,
  filePath,
  filePreviewRawUrl,
  kindLabelOf,
  languageOf,
  type FileKind,
} from "@/lib/files";
import { formatBytes, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<FileKind, IconName> = {
  html: "external",
  markdown: "file",
  code: "code",
  text: "file",
  archive: "archive",
  other: "cloud",
};

function kindIcon(kind: FileKind): IconName {
  return KIND_ICON[kind];
}

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const file = await getFileById(id).catch(() => null);
  if (!file) return { title: "文件不存在" };
  return {
    title: file.title || file.original_name || "文件",
    description: file.description || `${languageOf(file.ext)} 文件在线预览与下载`,
  };
}

export default async function FileDetailPage({ params }: PageProps) {
  const { id } = await params;
  const file = await getFileById(id);
  if (!file) notFound();

  const kind = fileKindOf(file.ext);
  const preview =
    kind === "html" || kind === "archive" || kind === "other"
      ? null
      : await readFilePreview(file);

  return (
    <div className="page-wrap">
      <Link href="/files" className="chip reveal mb-5">
        <Icon name="arrow-left" size={12} />
        全部文件
      </Link>

      <header className="reveal mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Files · {kind === "archive" || kind === "other" ? "下载" : "在线预览"}
          </span>
          <h1 className="display mt-3 text-[clamp(1.7rem,4.5vw,2.8rem)] [overflow-wrap:anywhere]">
            {file.title || file.original_name || "未命名文件"}
          </h1>
          {file.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted">{file.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a href={fileDownloadUrl(file)} className="btn btn-primary">
            <Icon name="download" size={15} />
            下载原文件
          </a>
          <CopyButton
            value={filePath(file)}
            label="复制链接"
            copiedLabel="已复制"
            className="btn"
          />
        </div>
      </header>

      <div className="reveal mb-4 flex flex-wrap items-center gap-2">
        <span className="chip chip-accent">
          <Icon name={kindIcon(kind)} size={12} />
          {kindLabelOf(file.ext)}
        </span>
        <span className="chip">{languageOf(file.ext)}</span>
        <span className="chip">{formatBytes(file.size)}</span>
        <span className="chip">{formatDateTime(file.created_at)}</span>
        {file.original_name && (
          <span className="chip max-w-full">
            <Icon name="file" size={12} />
            <span className="truncate font-mono">{file.original_name}</span>
          </span>
        )}
      </div>

      <div className="glass reveal rounded-[26px] p-3 sm:p-4">
        {kind === "html" ? (
          <div>
            <div className="file-frame">
              <iframe
                src={filePreviewRawUrl(file)}
                title={`${file.title || file.original_name} 预览`}
                sandbox=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mt-3 flex flex-col gap-1.5 px-1 text-[0.68rem] text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>沙箱预览：脚本、表单与同源请求均已禁用。</span>
              <a
                href={filePreviewRawUrl(file)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)]"
              >
                新窗口打开
                <Icon name="external" size={11} />
              </a>
            </div>
          </div>
        ) : kind === "archive" ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name="archive" size={22} />
            </span>
            <p className="mt-3 text-sm font-medium">压缩包需要下载后解压</p>
            <p className="mt-1 text-xs text-muted">
              {languageOf(file.ext)} 文件 · {formatBytes(file.size)}，浏览器无法直接展开。
            </p>
            <a href={fileDownloadUrl(file)} className="btn btn-primary mt-4">
              <Icon name="download" size={15} />
              下载压缩包
            </a>
          </div>
        ) : kind === "other" ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name="cloud" size={22} />
            </span>
            <p className="mt-3 text-sm font-medium">这种文件不支持在线预览</p>
            <p className="mt-1 text-xs text-muted">可以直接下载后用本地工具打开。</p>
            <a href={fileDownloadUrl(file)} className="btn btn-primary mt-4">
              <Icon name="download" size={15} />
              下载文件
            </a>
          </div>
        ) : preview && preview.status === "too-large" ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name="file" size={22} />
            </span>
            <p className="mt-3 text-sm font-medium">文件太大，暂不在线展开</p>
            <p className="mt-1 text-xs text-muted">
              超过 512KB 的文本请下载查看（当前 {formatBytes(file.size)}）。
            </p>
            <a href={fileDownloadUrl(file)} className="btn btn-primary mt-4">
              <Icon name="download" size={15} />
              下载文件
            </a>
          </div>
        ) : preview && preview.status === "missing" ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name="cloud" size={22} />
            </span>
            <p className="mt-3 text-sm font-medium">读取文件失败</p>
            <p className="mt-1 text-xs text-muted">R2 里可能没有这个对象，稍后再试或重新上传。</p>
          </div>
        ) : kind === "markdown" && preview ? (
          <div className="p-2 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[0.68rem] text-muted">
                <Icon name="file" size={13} className="text-[var(--accent)]" />
                {preview.totalLines} 行 · 渲染预览
              </span>
              <CopyButton
                value={preview.text}
                label="复制源码"
                copiedLabel="已复制"
                className="btn btn-ghost !px-2.5 !py-1 !text-[0.68rem]"
              />
            </div>
            <Markdown content={preview.text} />
            <details className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted">
                查看 Markdown 源码
              </summary>
              <div className="mt-3">
                <CodeBlock text={preview.text} />
              </div>
            </details>
            {preview.truncated && <TruncatedNote total={preview.totalLines} />}
          </div>
        ) : preview ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="flex min-w-0 flex-wrap items-center gap-2 text-[0.68rem] text-muted">
                <Icon name="code" size={13} className="shrink-0 text-[var(--accent)]" />
                <span className="min-w-0 max-w-full truncate font-mono">
                  {file.original_name || file.r2_key}
                </span>
                <span>
                  {preview.totalLines} 行 · {languageOf(file.ext)}
                </span>
              </span>
              <CopyButton
                value={preview.text}
                label="复制代码"
                copiedLabel="已复制"
                className="btn btn-ghost !px-2.5 !py-1 !text-[0.68rem]"
              />
            </div>
            <CodeBlock text={preview.text} />
            {preview.truncated && <TruncatedNote total={preview.totalLines} />}
          </div>
        ) : null}
      </div>

      <div className="reveal mt-4 flex flex-wrap items-center gap-2 text-[0.68rem] text-muted">
        <span className="shrink-0">文章内链：</span>
        <code className="chip max-w-full overflow-hidden font-mono !text-[0.64rem]">
          <span className="block min-w-0 truncate">{fileMarkdownSnippet(file)}</span>
        </code>
        <CopyButton
          value={fileMarkdownSnippet(file)}
          label="复制 Markdown"
          copiedLabel="已复制"
          absolute={false}
          className="btn btn-ghost !px-2.5 !py-1 !text-[0.68rem]"
        />
      </div>
    </div>
  );
}

function CodeBlock({ text }: { text: string }) {
  const lines = text.length > 0 ? text.split("\n") : [""];
  return (
    <div className="file-code">
      <pre>
        <code>
          {lines.map((line, index) => (
            <span key={index} className="file-line" data-line={index + 1}>
              {line.length > 0 ? line : "\u00a0"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function TruncatedNote({ total }: { total: number }) {
  return (
    <p className="mt-2 px-1 text-[0.66rem] text-muted">
      仅显示前 1200 行，共 {total} 行。下载原文件可查看完整内容。
    </p>
  );
}