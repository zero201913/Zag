"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { CopyButton } from "../copy-button";
import { Icon, type IconName } from "../icons";
import { apiRequest, uploadFile } from "@/lib/admin-client";
import {
  FILE_EXTENSIONS,
  baseNameOf,
  extOf,
  fileDownloadUrl,
  fileKindOf,
  filePath,
  fileMarkdownSnippet,
  kindLabelOf,
  languageOf,
  type FileKind,
} from "@/lib/files";
import type { FileRecord } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/utils";

const ACCEPT = FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

const KIND_ICON: Record<FileKind, IconName> = {
  html: "code",
  markdown: "file",
  code: "code",
  text: "file",
  other: "cloud",
};

interface UploadProgress {
  name: string;
  percent: number;
  index: number;
  total: number;
}

const KIND_FILTERS: Array<{ value: "all" | FileKind; label: string }> = [
  { value: "all", label: "全部" },
  { value: "code", label: "代码" },
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "text", label: "文本" },
  { value: "other", label: "其他" },
];

export function FilesManager({ initial }: { initial: FileRecord[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<FileRecord | null>(initial[0] ?? null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | FileKind>("all");
  const [uploading, setUploading] = useState<UploadProgress | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast, show } = useToast();

  const counts = useMemo(() => {
    const map = new Map<FileKind, number>();
    for (const item of items) {
      const key = fileKindOf(item.ext);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (kind !== "all" && fileKindOf(item.ext) !== kind) return false;
      if (!q) return true;
      return [item.title, item.original_name, item.description, item.ext]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, kind, query]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    let uploadedCount = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const ext = extOf(file.name);
      const progress = (percent: number) =>
        setUploading({ name: file.name, percent, index: index + 1, total: files.length });

      if (!FILE_EXTENSIONS.includes(ext)) {
        show(`${file.name}：不支持的文件类型`, "error");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        show(`${file.name}：文件超过 10MB`, "error");
        continue;
      }

      progress(0);
      try {
        const result = await uploadFile(file, "file", progress);
        const data = await apiRequest<{ item: FileRecord }>("/api/admin/files", {
          method: "POST",
          body: JSON.stringify({
            title: baseNameOf(file.name),
            description: "",
            r2_key: result.key,
            original_name: file.name,
            ext,
            mime: result.type,
            size: file.size,
          }),
        });
        setItems((list) => [data.item, ...list]);
        setEditing(data.item);
        setKind("all");
        uploadedCount += 1;
      } catch (error) {
        show(`${file.name}：${(error as Error).message}`, "error");
      }
    }

    setUploading(null);
    if (uploadedCount > 0) show(`已上传 ${uploadedCount} 个文件`);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function handleDelete(file: FileRecord) {
    if (!window.confirm(`确定删除「${file.title || file.original_name}」吗？R2 里的原文件也会被删除。`)) {
      return;
    }
    try {
      await apiRequest(`/api/admin/files/${file.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== file.id));
      if (editing?.id === file.id) setEditing(null);
      show("文件已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="文件"
        description="代码、文本、HTML、Markdown 等资源文件直接存进 R2，可在线预览、下载，也可作为文章内链。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handleInput}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading !== null}
            >
              <Icon
                name={uploading ? "loader" : "upload"}
                size={15}
                className={uploading ? "animate-spin" : ""}
              />
              {uploading ? "上传中…" : "上传文件"}
            </button>
          </div>
        }
      />

      {uploading && (
        <div className="glass-strong mb-4 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium">
              上传中（{uploading.index}/{uploading.total}）· {uploading.name}
            </span>
            <span className="font-mono text-[var(--accent)]">{uploading.percent}%</span>
          </div>
          <div className="progress mt-2">
            <span style={{ width: `${uploading.percent}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="min-w-0 space-y-3">
          <div
            className={`glass rounded-[24px] border-2 border-dashed p-4 transition-colors ${
              dragging
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)]"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center gap-1 py-3 text-center"
              onClick={() => inputRef.current?.click()}
              disabled={uploading !== null}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="upload" size={20} />
              </span>
              <span className="mt-1 text-sm font-medium">拖拽文件到这里，或点击选择</span>
              <span className="text-[0.7rem] text-muted">
                支持代码 / HTML / Markdown / 文本等，单个最大 10MB
              </span>
            </button>
          </div>

          <div className="glass rounded-[24px] p-3">
            <div className="flex flex-wrap items-center gap-2 px-1 py-1">
              <div className="relative min-w-[10rem] flex-1">
                <Icon
                  name="search"
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  className="field !py-2 !pl-8 !text-xs"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索文件名或描述"
                />
              </div>
              <span className="text-[0.66rem] text-muted">共 {items.length} 个文件</span>
            </div>

            <div className="flex flex-wrap gap-1.5 px-1 pb-2 pt-1">
              {KIND_FILTERS.map((filter) => {
                const count =
                  filter.value === "all" ? items.length : counts.get(filter.value) ?? 0;
                if (filter.value !== "all" && count === 0) return null;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    className={`chip ${kind === filter.value ? "chip-accent" : ""}`}
                    onClick={() => setKind(filter.value)}
                  >
                    {filter.label}
                    <span className="opacity-50">{count}</span>
                  </button>
                );
              })}
            </div>

            {items.length === 0 ? (
              <button
                type="button"
                className="m-1 flex w-[calc(100%-0.5rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                onClick={() => inputRef.current?.click()}
              >
                <Icon name="code" size={24} className="text-[var(--accent)]" />
                <span className="mt-3 text-sm font-medium">还没有文件</span>
                <span className="mt-1 text-xs text-muted">
                  上传一个 .html、.java、.py、.txt 或 .md 试试
                </span>
              </button>
            ) : visible.length === 0 ? (
              <div className="m-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
                <Icon name="search" size={22} className="text-[var(--accent)]" />
                <p className="mt-3 text-sm font-medium">没有匹配的文件</p>
                <p className="mt-1 text-xs text-muted">换个关键词或切换类型。</p>
              </div>
            ) : (
              <div className="max-h-[58vh] space-y-1.5 overflow-y-auto p-1" data-lenis-prevent>
                {visible.map((file) => {
                  const fileType = fileKindOf(file.ext);
                  const active = editing?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditing(file)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setEditing(file);
                        }
                      }}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-transparent hover:bg-[var(--glass-soft)]"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] font-mono text-[0.62rem] font-semibold uppercase text-[var(--accent)]">
                        {file.ext || "?"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {file.title || file.original_name || "未命名文件"}
                          </span>
                          <span className="chip !px-2 !py-0.5 !text-[0.58rem]">
                            {kindLabelOf(file.ext)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[0.64rem] text-muted">
                          {file.original_name || file.r2_key}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-right text-[0.62rem] text-muted sm:block">
                        <span className="block">{formatBytes(file.size)}</span>
                        <span className="block">{languageOf(file.ext)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <a
                          href={filePath(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-btn !h-7 !w-7"
                          aria-label="预览文件"
                          title="在线预览"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Icon name="eye" size={13} />
                        </a>
                        <a
                          href={fileDownloadUrl(file)}
                          className="icon-btn !h-7 !w-7"
                          aria-label="下载文件"
                          title="下载"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Icon name="download" size={13} />
                        </a>
                        <button
                          type="button"
                          className="icon-btn !h-7 !w-7 hover:text-red-500"
                          aria-label="删除文件"
                          title="删除"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(file);
                          }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </span>
                      <Icon name={KIND_ICON[fileType]} size={14} className="shrink-0 text-muted" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-editor min-w-0">
          {editing ? (
            <FileEditor
              key={editing.id}
              file={editing}
              onSaved={(item) => {
                setItems((list) => list.map((entry) => (entry.id === item.id ? item : entry)));
                setEditing(item);
                show("文件信息已保存");
              }}
              onError={(message) => show(message, "error")}
              onCopied={() => show("链接已复制")}
            />
          ) : (
            <div className="glass flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
              <Icon name="code" size={32} className="text-[var(--accent)]" />
              <p className="mt-3 text-sm text-muted">选择左侧文件，编辑标题与说明。</p>
              <p className="mt-1 text-[0.7rem] text-muted">
                预览与下载链接会自动生成，可以直接贴进文章。
              </p>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function FileEditor({
  file,
  onSaved,
  onError,
  onCopied,
}: {
  file: FileRecord;
  onSaved: (item: FileRecord) => void;
  onError: (message: string) => void;
  onCopied: () => void;
}) {
  const [form, setForm] = useState({ title: file.title, description: file.description });
  const [saving, setSaving] = useState(false);
  const previewPath = filePath(file);
  const downloadPath = fileDownloadUrl(file);
  const markdown = fileMarkdownSnippet({ id: file.id, title: form.title || file.original_name });

  async function save() {
    setSaving(true);
    try {
      const data = await apiRequest<{ item: FileRecord }>(`/api/admin/files/${file.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      onSaved(data.item);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-base font-semibold">编辑文件</h2>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? (
            <Icon name="loader" size={15} className="animate-spin" />
          ) : (
            <Icon name="check" size={15} />
          )}
          {saving ? "保存中…" : "保存"}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-mono text-[0.7rem] font-semibold uppercase text-[var(--accent)]">
            {file.ext || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs">{file.r2_key}</p>
            <p className="mt-0.5 text-[0.66rem] text-muted">
              {kindLabelOf(file.ext)} · {languageOf(file.ext)} · {formatBytes(file.size)}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <a
            href={previewPath}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost !px-2.5 !py-1 !text-[0.68rem]"
          >
            <Icon name="eye" size={13} />
            预览
          </a>
          <a
            href={downloadPath}
            className="btn btn-ghost !px-2.5 !py-1 !text-[0.68rem]"
          >
            <Icon name="download" size={13} />
            下载
          </a>
          <span className="ml-auto self-center text-[0.64rem] text-muted">
            {formatDateTime(file.created_at)}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        <AdminField label="标题">
          <input
            className="field"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="给文件起个名字"
          />
        </AdminField>

        <AdminField label="说明" hint="会显示在文件预览页，也参与站内搜索">
          <textarea
            className="field min-h-[80px]"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="这份文件是什么、怎么用，或者什么都不写"
          />
        </AdminField>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--glass-soft)] p-3">
        <div className="flex items-center gap-2 px-0.5 pb-2">
          <Icon name="code" size={14} className="text-[var(--accent)]" />
          <p className="text-xs font-semibold">文章内链</p>
          <span className="text-[0.62rem] text-muted">复制后直接粘进文章</span>
        </div>

        <div className="space-y-1.5">
          <SnippetRow label="预览页" value={previewPath} onCopied={onCopied} onError={onError} />
          <SnippetRow label="下载直链" value={downloadPath} onCopied={onCopied} onError={onError} />
          <SnippetRow label="Markdown" value={markdown} copyValue={markdown} onCopied={onCopied} onError={onError} />
        </div>

        <p className="mt-2 text-[0.64rem] leading-relaxed text-muted">
          HTML 文件在沙箱 iframe 里预览，脚本不会执行；下载链接会让浏览器直接保存原文件。
        </p>
      </div>
    </div>
  );
}

function SnippetRow({
  label,
  value,
  copyValue,
  onCopied,
  onError,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopied: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)]/60 px-2 py-1.5">
      <span className="w-16 shrink-0 text-[0.64rem] text-muted">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[0.64rem]">{value}</code>
      <CopyButton
        value={copyValue ?? value}
        label="复制"
        copiedLabel="已复制"
        className="btn btn-ghost shrink-0 !px-2 !py-1 !text-[0.64rem]"
        onCopied={onCopied}
        onError={onError}
      />
    </div>
  );
}