"use client";

import { useEffect, useRef, useState } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { UploadButton } from "./upload-button";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import { renderMarkdown } from "@/lib/markdown";
import type { Post, PostPage } from "@/lib/types";
import { formatShortDate, mediaUrl } from "@/lib/utils";

function blankPost(): Post {
  return {
    id: "",
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    cover_url: null,
    tags: "",
    status: "draft",
    featured: 0,
    created_at: 0,
    updated_at: 0,
  };
}

function mergeTags(existing: string, incoming: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const part of [...existing.split(","), ...incoming]) {
    const tag = part.trim();
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(tag);
    if (merged.length >= 12) break;
  }
  return merged.join(",");
}

export function PostsManager({
  initial,
  initialPage,
  initialTotal,
  initialTotalPages,
  initialQuery,
  pageSize,
}: {
  initial: Post[];
  initialPage: number;
  initialTotal: number;
  initialTotalPages: number;
  initialQuery: string;
  pageSize: number;
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Post | null>(initial[0] ?? null);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);
  const { toast, show } = useToast();

  async function loadPage(nextPage: number, nextQuery = query) {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await apiRequest<PostPage>(
        `/api/admin/posts?page=${nextPage}&q=${encodeURIComponent(nextQuery)}`,
      );
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setQuery(data.query);
      setSearch(data.query);
      setEditing((current) => {
        if (current) {
          const stillHere = data.items.find((entry) => entry.id === current.id);
          if (stillHere) return stillHere;
        }
        return data.items[0] ?? null;
      });
    } catch (error) {
      if (seq === requestSeq.current) show((error as Error).message, "error");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (search.trim() === query) return;
    const timer = window.setTimeout(() => {
      void loadPage(1, search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query]);

  function startNew() {
    setEditing(blankPost());
  }

  function handleSaved(item: Post, isNew: boolean) {
    if (isNew) {
      show(item.status === "published" ? "文章已保存并发布" : "草稿已保存");
      setEditing(item);
      setSearch("");
      void loadPage(1, "");
      return;
    }

    setItems((list) => list.map((entry) => (entry.id === item.id ? item : entry)));
    setEditing(item);
    show(item.status === "published" ? "文章已保存并发布" : "草稿已保存");
  }

  async function handleDelete(post: Post) {
    if (!window.confirm(`确定删除文章「${post.title}」吗？此操作不可撤销。`)) return;
    try {
      await apiRequest(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      await loadPage(items.length === 1 && page > 1 ? page - 1 : page);
      show("文章已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  const draftCount = items.filter((item) => item.status === "draft").length;

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="文章"
        description="写 Markdown，保存后立即出现在文章页。"
        action={
          <button type="button" className="btn btn-primary" onClick={startNew}>
            <Icon name="plus" size={15} />
            新建文章
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div className="glass flex min-h-0 flex-col rounded-[24px] p-3">
          <div className="space-y-2 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                全部文章 · {total}
              </p>
              <span className="text-[0.66rem] text-muted">
                {loading ? "加载中…" : `本页 ${draftCount} 草稿`}
              </span>
            </div>
            <div className="relative">
              <Icon
                name="search"
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                className="field !py-2 !pl-9 !text-xs"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索标题，快速定位文章…"
                aria-label="搜索文章标题"
              />
            </div>
          </div>
          <div className="max-h-[60vh] min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 xl:max-h-none">
            {items.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center px-3 py-10 text-center">
                <Icon name="file" size={22} className="text-[var(--accent)] opacity-70" />
                <p className="mt-2 text-sm text-muted">
                  {query ? `没有找到标题包含「${query}」的文章。` : "还没有文章，点右上角新建一篇。"}
                </p>
                {query && (
                  <button
                    type="button"
                    className="btn btn-ghost mt-3 !px-3 !py-1.5 !text-xs"
                    onClick={() => setSearch("")}
                  >
                    清除搜索
                  </button>
                )}
              </div>
            )}
            {items.map((post) => (
              <div
                key={post.id}
                className={`group flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                  editing?.id === post.id
                    ? "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[var(--accent-soft)]"
                    : "border-transparent hover:bg-[var(--glass-soft)]"
                }`}
                onClick={() => setEditing(post)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--glass-soft)] text-[var(--accent)]">
                  <Icon name="file" size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {post.title || "未命名文章"}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[0.66rem] text-muted">
                    <span className={post.status === "published" ? "text-[var(--accent-3)]" : ""}>
                      {post.status === "published" ? "已发布" : "草稿"}
                    </span>
                    <span>·</span>
                    <span>{post.created_at ? formatShortDate(post.created_at) : "未保存"}</span>
                    {post.featured === 1 && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--accent)]">精选</span>
                      </>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(post);
                  }}
                  aria-label={`删除 ${post.title}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border)] px-1 pt-2.5">
            <button
              type="button"
              className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"
              disabled={page <= 1 || loading}
              onClick={() => void loadPage(page - 1)}
            >
              <Icon name="chevron-left" size={13} />
              上一页
            </button>
            <span className="text-[0.66rem] text-muted">
              第 {page} / {totalPages} 页 · 每页 {pageSize} 条
            </span>
            <button
              type="button"
              className="btn btn-ghost !px-2.5 !py-1.5 !text-xs"
              disabled={page >= totalPages || loading}
              onClick={() => void loadPage(page + 1)}
            >
              下一页
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        </div>

        <div className="admin-editor">
          {editing ? (
            <PostEditor
              key={editing.id || "new"}
              post={editing}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
              onError={(message) => show(message, "error")}
              onNotice={(message) => show(message)}
            />
          ) : (
            <div className="glass flex min-h-[420px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="pencil" size={24} />
              </span>
              <h3 className="mt-4 text-base font-semibold">选择一篇文章开始编辑</h3>
              <p className="mt-1 max-w-xs text-sm text-muted">
                或者新建一篇。支持 Markdown、封面图、标签与草稿状态。
              </p>
              <button type="button" className="btn btn-primary mt-4" onClick={startNew}>
                <Icon name="plus" size={15} />
                新建文章
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function PostEditor({
  post,
  onSaved,
  onCancel,
  onError,
  onNotice,
}: {
  post: Post;
  onSaved: (item: Post, isNew: boolean) => void;
  onCancel: () => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [form, setForm] = useState(post);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [aiExcerpt, setAiExcerpt] = useState(false);
  const [aiTags, setAiTags] = useState(false);

  function update<K extends keyof Post>(key: K, value: Post[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generateExcerpt() {
    if (!form.content.trim()) {
      onError("请先输入正文，再生成摘要");
      return;
    }
    if (
      form.excerpt.trim() &&
      !window.confirm("当前摘要已有内容，确定用 AI 生成的摘要覆盖吗？")
    ) {
      return;
    }

    setAiExcerpt(true);
    try {
      const data = await apiRequest<{ excerpt: string }>("/api/admin/ai", {
        method: "POST",
        body: JSON.stringify({
          task: "excerpt",
          title: form.title,
          content: form.content,
        }),
      });
      update("excerpt", data.excerpt);
      onNotice("AI 摘要已生成");
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setAiExcerpt(false);
    }
  }

  async function generateTags() {
    if (!form.content.trim()) {
      onError("请先输入正文，再生成标签");
      return;
    }

    setAiTags(true);
    try {
      const data = await apiRequest<{ tags: string[] }>("/api/admin/ai", {
        method: "POST",
        body: JSON.stringify({
          task: "tags",
          title: form.title,
          content: form.content,
        }),
      });
      const incoming = Array.isArray(data.tags) ? data.tags : [];
      const merged = mergeTags(form.tags, incoming);
      update("tags", merged);
      const count = merged ? merged.split(",").length : 0;
      onNotice(incoming.length ? `标签已合并，共 ${count} 个` : "AI 没有补充新的标签");
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setAiTags(false);
    }
  }

  async function save() {
    if (!form.title.trim()) {
      onError("请先填写文章标题");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.content,
        cover_url: form.cover_url,
        tags: form.tags,
        status: form.status,
        featured: form.featured === 1,
      };
      const isNew = !post.id;
      const data = isNew
        ? await apiRequest<{ item: Post }>("/api/admin/posts", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ item: Post }>(`/api/admin/posts/${post.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
      onSaved(data.item, isNew);
      setForm(data.item);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const aiBusy = aiExcerpt || aiTags;

  return (
    <div className="glass rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{post.id ? "编辑文章" : "新建文章"}</h2>
          <p className="text-[0.68rem] text-muted">
            {post.id ? "修改后记得保存" : "保存后会生成唯一的 slug"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !px-3" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Icon name="loader" size={15} className="animate-spin" /> : <Icon name="check" size={15} />}
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      <div className="space-y-3.5">
        <AdminField label="标题">
          <input
            className="field !text-base !font-semibold"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="给这篇文章起个名字"
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Slug" hint="留空会根据标题自动生成">
            <input
              className="field font-mono !text-xs"
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
              placeholder="my-first-post"
            />
          </AdminField>
          <AdminField label="状态">
            <select
              className="field"
              value={form.status}
              onChange={(event) => update("status", event.target.value as Post["status"])}
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </AdminField>
        </div>

        <AdminField
          label="摘要"
          hint="显示在列表卡片上，留空会自动截取正文"
          action={
            <button
              type="button"
              className="chip disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void generateExcerpt()}
              disabled={aiExcerpt || aiBusy}
            >
              <Icon
                name={aiExcerpt ? "loader" : "sparkles"}
                size={11}
                className={aiExcerpt ? "animate-spin" : ""}
              />
              {aiExcerpt ? "生成中…" : "AI 总结"}
            </button>
          }
        >
          <textarea
            className="field min-h-[72px]"
            value={form.excerpt}
            onChange={(event) => update("excerpt", event.target.value)}
            placeholder="一句话概括这篇文章…"
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField
            label="标签"
            hint="用逗号分隔，AI 生成会与手写标签合并"
            action={
              <button
                type="button"
                className="chip disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void generateTags()}
                disabled={aiTags || aiBusy}
              >
                <Icon
                  name={aiTags ? "loader" : "sparkles"}
                  size={11}
                  className={aiTags ? "animate-spin" : ""}
                />
                {aiTags ? "生成中…" : "AI 生成标签"}
              </button>
            }
          >
            <input
              className="field"
              value={form.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder="Next.js, 设计, 随笔"
            />
          </AdminField>
          <AdminField label="封面">
            <div className="flex items-center gap-2">
              <input
                className="field font-mono !text-xs"
                value={form.cover_url ?? ""}
                onChange={(event) => update("cover_url", event.target.value || null)}
                placeholder="上传或粘贴图片地址"
              />
              <UploadButton
                kind="cover"
                label="上传"
                accept="image/*"
                className="btn shrink-0"
                onUploaded={(result) => update("cover_url", result.key)}
                onError={onError}
              />
            </div>
          </AdminField>
        </div>

        {form.cover_url && (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(form.cover_url)}
              alt="封面预览"
              className="max-h-48 w-full object-cover"
            />
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur"
              onClick={() => update("cover_url", null)}
              aria-label="移除封面"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-soft)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured === 1}
            onChange={(event) => update("featured", event.target.checked ? 1 : 0)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          设为精选文章
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">正文 · Markdown</span>
            <div className="flex items-center gap-2">
              <span className="text-[0.66rem] text-muted">{form.content.length} 字符</span>
              <button
                type="button"
                className="chip"
                onClick={() => setPreview((value) => !value)}
              >
                <Icon name={preview ? "pencil" : "eye"} size={12} />
                {preview ? "继续编辑" : "预览"}
              </button>
            </div>
          </div>
          {preview ? (
            <div className="min-h-[380px] rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_45%,transparent)] p-5">
              <div className="prose-zag" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }} />
            </div>
          ) : (
            <textarea
              className="field min-h-[380px] font-mono !text-[0.82rem] !leading-relaxed"
              value={form.content}
              onChange={(event) => update("content", event.target.value)}
              placeholder={"## 从这里开始\n\n写点什么…"}
            />
          )}
        </div>
      </div>
    </div>
  );
}