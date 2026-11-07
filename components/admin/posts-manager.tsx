"use client";

import { useState } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { UploadButton } from "./upload-button";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import { renderMarkdown } from "@/lib/markdown";
import type { Post } from "@/lib/types";
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

export function PostsManager({ initial }: { initial: Post[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Post | null>(initial[0] ?? null);
  const { toast, show } = useToast();

  function startNew() {
    setEditing(blankPost());
  }

  function handleSaved(item: Post) {
    setItems((list) => {
      const exists = list.some((entry) => entry.id === item.id);
      if (exists) return list.map((entry) => (entry.id === item.id ? item : entry));
      return [item, ...list];
    });
    setEditing(item);
    show(item.status === "published" ? "文章已保存并发布" : "草稿已保存");
  }

  async function handleDelete(post: Post) {
    if (!window.confirm(`确定删除文章「${post.title}」吗？此操作不可撤销。`)) return;
    try {
      await apiRequest(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== post.id));
      if (editing?.id === post.id) setEditing(null);
      show("文章已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

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
        <div className="glass rounded-[24px] p-3">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              全部文章 · {items.length}
            </p>
            <span className="text-[0.66rem] text-muted">
              {items.filter((item) => item.status === "draft").length} 草稿
            </span>
          </div>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {items.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted">
                还没有文章，点右上角新建一篇。
              </p>
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
        </div>

        <div className="admin-editor">
          {editing ? (
            <PostEditor
              key={editing.id || "new"}
              post={editing}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
              onError={(message) => show(message, "error")}
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
}: {
  post: Post;
  onSaved: (item: Post) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(post);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  function update<K extends keyof Post>(key: K, value: Post[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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
      const data = post.id
        ? await apiRequest<{ item: Post }>(`/api/admin/posts/${post.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ item: Post }>("/api/admin/posts", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      onSaved(data.item);
      setForm(data.item);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

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

        <AdminField label="摘要" hint="显示在列表卡片上，留空会自动截取正文">
          <textarea
            className="field min-h-[72px]"
            value={form.excerpt}
            onChange={(event) => update("excerpt", event.target.value)}
            placeholder="一句话概括这篇文章…"
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="标签" hint="用逗号分隔">
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