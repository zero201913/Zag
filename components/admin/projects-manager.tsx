"use client";

import { useState } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import type { Project } from "@/lib/types";
import { formatShortDate, parseTags } from "@/lib/utils";

function blankProject(): Project {
  return {
    id: "",
    name: "",
    description: "",
    url: "",
    repo_url: null,
    icon: "sparkles",
    tags: "",
    sort_order: 0,
    created_at: 0,
  };
}

const ICON_OPTIONS = ["sparkles", "database", "cloud", "code", "folder", "grid"];

export function ProjectsManager({ initial }: { initial: Project[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Project | null>(initial[0] ?? null);
  const { toast, show } = useToast();

  function handleSaved(item: Project) {
    setItems((list) => {
      const exists = list.some((entry) => entry.id === item.id);
      const next = exists
        ? list.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...list];
      return next.sort((a, b) => a.sort_order - b.sort_order);
    });
    setEditing(item);
    show("项目已保存");
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`确定删除项目「${project.name}」吗？`)) return;
    try {
      await apiRequest(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== project.id));
      if (editing?.id === project.id) setEditing(null);
      show("项目已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="项目"
        description="管理展示在项目页的作品与链接。"
        action={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(blankProject())}>
            <Icon name="plus" size={15} />
            新建项目
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="glass rounded-[24px] p-3">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            全部项目 · {items.length}
          </p>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {items.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted">还没有项目。</p>
            )}
            {items.map((project) => (
              <div
                key={project.id}
                className={`group flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                  editing?.id === project.id
                    ? "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[var(--accent-soft)]"
                    : "border-transparent hover:bg-[var(--glass-soft)]"
                }`}
                onClick={() => setEditing(project)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--glass-soft)] text-[var(--accent)]">
                  <Icon name="folder" size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{project.name}</span>
                  <span className="block truncate text-[0.66rem] text-muted">
                    {project.url || "未设置链接"}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {parseTags(project.tags).slice(0, 3).map((tag) => (
                      <span key={tag} className="chip !px-1.5 !py-0 !text-[0.6rem]">
                        {tag}
                      </span>
                    ))}
                    <span className="text-[0.6rem] text-muted">
                      {project.created_at ? formatShortDate(project.created_at) : "未保存"}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(project);
                  }}
                  aria-label={`删除 ${project.name}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-editor">
          {editing ? (
            <ProjectEditor
              key={editing.id || "new"}
              project={editing}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
              onError={(message) => show(message, "error")}
            />
          ) : (
            <div className="glass flex min-h-[340px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
              <Icon name="folder" size={32} className="text-[var(--accent)]" />
              <p className="mt-3 text-sm text-muted">选择左侧项目，或新建一个。</p>
              <button type="button" className="btn btn-primary mt-4" onClick={() => setEditing(blankProject())}>
                <Icon name="plus" size={15} />
                新建项目
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function ProjectEditor({
  project,
  onSaved,
  onCancel,
  onError,
}: {
  project: Project;
  onSaved: (item: Project) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(project);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Project>(key: K, value: Project[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      onError("请填写项目名称");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        url: form.url,
        repo_url: form.repo_url,
        icon: form.icon,
        tags: form.tags,
        sort_order: form.sort_order,
      };
      const data = project.id
        ? await apiRequest<{ item: Project }>(`/api/admin/projects/${project.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ item: Project }>("/api/admin/projects", {
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
        <h2 className="text-base font-semibold">{project.id ? "编辑项目" : "新建项目"}</h2>
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
        <AdminField label="项目名称">
          <input
            className="field !text-base !font-semibold"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="例如：Zag Blog"
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="项目链接" hint="以 / 开头可跳转站内页面">
            <input
              className="field font-mono !text-xs"
              value={form.url}
              onChange={(event) => update("url", event.target.value)}
              placeholder="https://…"
            />
          </AdminField>
          <AdminField label="源码链接">
            <input
              className="field font-mono !text-xs"
              value={form.repo_url ?? ""}
              onChange={(event) => update("repo_url", event.target.value || null)}
              placeholder="https://github.com/…"
            />
          </AdminField>
        </div>

        <AdminField label="项目描述">
          <textarea
            className="field min-h-[100px]"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="这个项目是做什么的？"
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-3">
          <AdminField label="图标">
            <select
              className="field"
              value={form.icon}
              onChange={(event) => update("icon", event.target.value)}
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="标签" hint="逗号分隔">
            <input
              className="field"
              value={form.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder="Next.js, D1"
            />
          </AdminField>
          <AdminField label="排序" hint="数字越小越靠前">
            <input
              type="number"
              className="field"
              value={form.sort_order}
              onChange={(event) => update("sort_order", Number(event.target.value))}
            />
          </AdminField>
        </div>
      </div>
    </div>
  );
}