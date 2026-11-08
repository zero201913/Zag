"use client";

import { useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import type { Note } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const MAX_LENGTH = 2000;

export function NotesManager({ initial }: { initial: Note[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [publishing, setPublishing] = useState(false);
  const { toast, show } = useToast();

  async function publish() {
    const content = draft.trim();
    if (!content) {
      show("先写点什么再发布", "error");
      return;
    }
    setPublishing(true);
    try {
      const data = await apiRequest<{ item: Note }>("/api/admin/notes", {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setItems((list) => [data.item, ...list]);
      setDraft("");
      show("说说已发布，主页时间线会立即更新");
    } catch (error) {
      show((error as Error).message, "error");
    } finally {
      setPublishing(false);
    }
  }

  async function remove(note: Note) {
    if (!window.confirm("确定删除这条说说吗？此操作不可撤销。")) return;
    try {
      await apiRequest(`/api/admin/notes/${note.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== note.id));
      show("说说已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="说说"
        description="没有标题、摘要和标签的短文字，发布后直接进入主页时间线。"
        action={
          <span className="chip">
            <Icon name="message" size={13} />
            {items.length} 条
          </span>
        }
      />

      <div className="glass rounded-[24px] p-5">
        <textarea
          className="field min-h-[132px] resize-y !leading-relaxed"
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void publish();
            }
          }}
          placeholder="记录此刻的想法…支持换行，Ctrl / ⌘ + Enter 快速发布"
          aria-label="说说内容"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[0.68rem] text-muted">
            {draft.length} / {MAX_LENGTH} · 主页默认只显示前 50 字，可展开
          </span>
          <button
            type="button"
            className="btn btn-primary shrink-0"
            onClick={() => void publish()}
            disabled={publishing || !draft.trim()}
          >
            <Icon
              name={publishing ? "loader" : "plus"}
              size={15}
              className={publishing ? "animate-spin" : ""}
            />
            {publishing ? "发布中…" : "发布说说"}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="glass-soft rounded-[24px] px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon name="message" size={22} />
            </span>
            <h3 className="mt-3 text-base font-semibold">还没有说说</h3>
            <p className="mt-1 text-sm text-muted">在上面的输入框写点短句，发布后会出现在主页。</p>
          </div>
        ) : (
          items.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onSaved={(item) => {
                setItems((list) =>
                  list.map((entry) => (entry.id === item.id ? item : entry)),
                );
                show("说说已更新");
              }}
              onDelete={() => void remove(note)}
              onError={(message) => show(message, "error")}
            />
          ))
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function NoteRow({
  note,
  onSaved,
  onDelete,
  onError,
}: {
  note: Note;
  onSaved: (item: Note) => void;
  onDelete: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const edited = note.updated_at > note.created_at;

  async function save() {
    const content = value.trim();
    if (!content) {
      onError("说说内容不能为空");
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest<{ item: Note }>(`/api/admin/notes/${note.id}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      setValue(data.item.content);
      onSaved(data.item);
      setEditing(false);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="glass rounded-[22px] px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2 text-[0.66rem] text-muted">
        <Icon name="clock" size={12} />
        <span>{formatDateTime(note.created_at)}</span>
        {edited && <span className="chip !px-2 !py-0.5 !text-[0.6rem]">已编辑</span>}
        <span className="ml-auto">{Array.from(note.content).length} 字</span>
      </div>

      {editing ? (
        <>
          <textarea
            className="field mt-2.5 min-h-[110px] resize-y !text-sm !leading-relaxed"
            value={value}
            maxLength={MAX_LENGTH}
            onChange={(event) => setValue(event.target.value)}
            aria-label="编辑说说内容"
          />
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[0.66rem] text-muted">Ctrl / ⌘ + Enter 保存</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-1.5 !text-xs"
                onClick={() => {
                  setValue(note.content);
                  setEditing(false);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary !px-3 !py-1.5 !text-xs"
                onClick={() => void save()}
                disabled={saving}
              >
                <Icon
                  name={saving ? "loader" : "check"}
                  size={13}
                  className={saving ? "animate-spin" : ""}
                />
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="note-admin-text mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {note.content}
          </p>
          <div className="mt-2 flex items-center justify-end gap-1">
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              onClick={() => setEditing(true)}
              aria-label="编辑这条说说"
              title="编辑"
            >
              <Icon name="pencil" size={14} />
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
              onClick={onDelete}
              aria-label="删除这条说说"
              title="删除"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </>
      )}
    </article>
  );
}