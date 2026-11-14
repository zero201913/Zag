import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { listFiles } from "@/lib/db";
import {
  fileDownloadUrl,
  fileKindOf,
  filePath,
  kindLabelOf,
  languageOf,
  type FileKind,
} from "@/lib/files";
import type { FileRecord } from "@/lib/types";
import { formatBytes, formatShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "文件" };

const ORDER: FileKind[] = ["code", "markdown", "html", "text", "archive", "other"];

const KIND_META: Record<FileKind, { icon: IconName; title: string; note: string }> = {
  code: { icon: "code", title: "代码", note: "可以直接读的实现与脚本" },
  markdown: { icon: "file", title: "Markdown", note: "渲染后的文档" },
  html: { icon: "external", title: "HTML 页面", note: "沙箱里预览，脚本不执行" },
  text: { icon: "file", title: "文本", note: "日志、数据与纯文本" },
  archive: { icon: "archive", title: "压缩包", note: "下载后解压查看" },
  other: { icon: "cloud", title: "其他", note: "其他可下载的资源" },
};

function groupFiles(files: FileRecord[]) {
  const groups = new Map<FileKind, FileRecord[]>();
  for (const file of files) {
    const kind = fileKindOf(file.ext);
    const list = groups.get(kind) ?? [];
    list.push(file);
    groups.set(kind, list);
  }
  return ORDER.filter((kind) => groups.has(kind)).map((kind) => [kind, groups.get(kind)!] as const);
}

export default async function FilesPage() {
  const files = await listFiles();
  const groups = groupFiles(files);

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Files · 文件"
        title="可以带走的资源"
        description="文章里引用的代码、文档、页面和压缩包都放在这里。在线预览，或者直接下载原文件。"
        right={
          <span className="chip">
            <Icon name="code" size={13} />
            {files.length} 个文件
          </span>
        }
      />

      {files.length === 0 ? (
        <EmptyState
          icon="code"
          title="文件库还是空的"
          description="去后台上传第一个文件，之后就能在文章里直接引用。"
          actionHref="/admin/files"
          actionLabel="进入后台"
        />
      ) : (
        <div className="space-y-10">
          {groups.map(([kind, items], groupIndex) => {
            const meta = KIND_META[kind];
            return (
              <section key={kind} className="reveal" style={{ ["--i" as string]: groupIndex }}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon name={meta.icon} size={16} />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em]">{meta.title}</h2>
                    <p className="text-[0.7rem] text-muted">
                      {items.length} 个 · {meta.note}
                    </p>
                  </div>
                  <div className="divider flex-1" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((file) => (
                    <div
                      key={file.id}
                      id={`file-${file.id}`}
                      className="glass card card-hover !p-0 overflow-hidden"
                    >
                      <Link href={filePath(file)} className="flex flex-col gap-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-mono text-[0.68rem] font-semibold uppercase text-[var(--accent)]">
                            {file.ext || "?"}
                          </span>
                          <span className="chip !px-2 !py-0.5 !text-[0.6rem]">
                            {kindLabelOf(file.ext)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[0.98rem] font-semibold leading-snug">
                            {file.title || file.original_name}
                          </h3>
                          <p className="mt-0.5 truncate font-mono text-[0.66rem] text-muted">
                            {file.original_name || file.r2_key}
                          </p>
                          {file.description && (
                            <p className="clip-2 mt-2 text-[0.8rem] leading-relaxed text-muted">
                              {file.description}
                            </p>
                          )}
                        </div>
                      </Link>
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-2 text-[0.68rem] text-muted">
                        <span className="font-mono">
                          {formatBytes(file.size)} · {languageOf(file.ext)} ·{" "}
                          {formatShortDate(file.created_at)}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <Link
                            href={filePath(file)}
                            className="inline-flex items-center gap-1 text-[var(--accent)]"
                          >
                            <Icon name="eye" size={12} />
                            预览
                          </Link>
                          <a
                            href={fileDownloadUrl(file)}
                            className="inline-flex items-center gap-1 text-[var(--accent)]"
                          >
                            <Icon name="download" size={12} />
                            下载
                          </a>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}