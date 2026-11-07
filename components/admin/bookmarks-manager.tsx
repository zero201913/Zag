"use client";

import { useState } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import type { Bookmark } from "@/lib/types";

function blankBookmark(): Bookmark {
  return {
    id: "",
    title: "",
    url: "",
    description: "",
    category: "收藏",
    created_at: 0,
  };
}

export function BookmarksManager({ initial }: { initial: Bookmark[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Bookmark | null>(initial[0] ?? null);
  const { toast, show } = useToast();

  function handleSaved(item: Bookmark) {
    setItems((list) => {
      const exists = list.some((entry) => entry.id === item.id);
      return exists
        ? list.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...list];
    });
    setEditing(item);
    show("收藏已保存");
  }

  async function handleDelete(bookmark: Bookmark) {
    if (!window.confirm(`确定删除收藏「${bookmark.title}」吗？`)) return;
    try {
      await apiRequest(`/api/admin/bookmarks/${bookmark.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== bookmark.id));
      if (editing?.id === bookmark.id) setEditing(null);
      show("收藏已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="收藏夹"
        description="把值得反复打开的网站按分类收好。"
        action={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(blankBookmark())}>
            <Icon name="plus" size={15} />
            新建收藏
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="glass rounded-[24px] p-3">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            全部收藏 · {items.length}
          </p>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {items.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted">还没有收藏。</p>
            )}
            {items.map((bookmark) => (
              <div
                key={bookmark.id}
                className={`group flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                  editing?.id === bookmark.id
                    ? "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[var(--accent-soft)]"
                    : "border-transparent hover:bg-[var(--glass-soft)]"
                }`}
                onClick={() => setEditing(bookmark)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--glass-soft)] text-[var(--accent)]">
                  <Icon name="bookmark" size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{bookmark.title}</span>
                    <span className="chip !px-1.5 !py-0 !text-[0.6rem]">{bookmark.category}</span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[0.64rem] text-[var(--accent)]">
                    {bookmark.url}
                  </span>
                  {bookmark.description && (
                    <span className="mt-0.5 block truncate text-[0.66rem] text-muted">
                      {bookmark.description}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(bookmark);
                  }}
                  aria-label={`删除 ${bookmark.title}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-editor">
          {editing ? (
            <BookmarkEditor
              key={editing.id || "new"}
              bookmark={editing}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
              onError={(message) => show(message, "error")}
            />
          ) : (
            <div className="glass flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
              <Icon name="bookmark" size={32} className="text-[var(--accent)]" />
              <p className="mt-3 text-sm text-muted">选择一条收藏，或新建一条。</p>
              <button type="button" className="btn btn-primary mt-4" onClick={() => setEditing(blankBookmark())}>
                <Icon name="plus" size={15} />
                新建收藏
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function BookmarkEditor({
  bookmark,
  onSaved,
  onCancel,
  onError,
}: {
  bookmark: Bookmark;
  onSaved: (item: Bookmark) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(bookmark);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Bookmark>(key: K, value: Bookmark[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.title.trim() || !form.url.trim()) {
      onError("标题和链接都不能为空");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        url: form.url,
        description: form.description,
        category: form.category,
      };
      const data = bookmark.id
        ? await apiRequest<{ item: Bookmark }>(`/api/admin/bookmarks/${bookmark.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ item: Bookmark }>("/api/admin/bookmarks", {
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
        <h2 className="text-base font-semibold">{bookmark.id ? "编辑收藏" : "新建收藏"}</h2>
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
            placeholder="网站名称"
          />
        </AdminField>

        <AdminField label="链接">
          <input
            className="field font-mono !text-xs"
            value={form.url}
            onChange={(event) => update("url", event.target.value)}
            placeholder="https://…"
          />
        </AdminField>

        <AdminField label="分类" hint="相同分类会归到同一组">
          <input
            className="field"
            value={form.category}
            onChange={(event) => update("category", event.target.value)}
            placeholder="开发 / 设计 / 灵感"
            list="bookmark-categories"
          />
          <datalist id="bookmark-categories">
            <option value="开发" />
            <option value="设计" />
            <option value="灵感" />
            <option value="工具" />
            <option value="收藏" />
          </datalist>
        </AdminField>

        <AdminField label="描述">
          <textarea
            className="field min-h-[110px]"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="为什么值得收藏？"
          />
        </AdminField>

        {form.url && (
          <a
            href={form.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn w-full"
          >
            <Icon name="external" size={15} />
            打开链接检查
          </a>
        )}
      </div>
    </div>
  );
}