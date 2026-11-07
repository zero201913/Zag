"use client";

import { useState, type FormEvent } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import { renderMarkdown } from "@/lib/markdown";

export function SettingsManager({ initial }: { initial: Record<string, string> }) {
  const [form, setForm] = useState({
    hero_title: initial.hero_title ?? "",
    hero_subtitle: initial.hero_subtitle ?? "",
    about_content: initial.about_content ?? "",
    footer_tagline: initial.footer_tagline ?? "",
    github_url: initial.github_url ?? "",
    email: initial.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [changingCode, setChangingCode] = useState(false);
  const [hasCustomCode, setHasCustomCode] = useState(Boolean(initial.admin_code_hash));

  const { toast, show } = useToast();

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      show("站点文案已保存");
    } catch (error) {
      show((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function changeCode(event: FormEvent) {
    event.preventDefault();
    if (newCode !== confirmCode) {
      show("两次输入的新指令不一致", "error");
      return;
    }
    if (newCode.length < 6) {
      show("新指令至少 6 个字符", "error");
      return;
    }
    setChangingCode(true);
    try {
      await apiRequest("/api/admin/access-code", {
        method: "POST",
        body: JSON.stringify({ currentCode, newCode }),
      });
      setCurrentCode("");
      setNewCode("");
      setConfirmCode("");
      setHasCustomCode(true);
      show("进入指令已更新，其他登录会话已失效");
    } catch (error) {
      show((error as Error).message, "error");
    } finally {
      setChangingCode(false);
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="设置"
        description="修改首页文案、关于页内容、联系方式与后台进入指令。"
        action={
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Icon name="loader" size={15} className="animate-spin" /> : <Icon name="check" size={15} />}
            {saving ? "保存中…" : "保存文案"}
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="space-y-4">
          <div className="glass rounded-[24px] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="home" size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold">首页文案</h2>
                <p className="text-[0.66rem] text-muted">显示在首页最上方的大标题</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <AdminField label="主标题" hint="用中文逗号分隔时，后半句会渐变高亮">
                <input
                  className="field !text-base !font-semibold"
                  value={form.hero_title}
                  onChange={(event) => update("hero_title", event.target.value)}
                />
              </AdminField>
              <AdminField label="副标题">
                <textarea
                  className="field min-h-[90px]"
                  value={form.hero_subtitle}
                  onChange={(event) => update("hero_subtitle", event.target.value)}
                />
              </AdminField>
            </div>
          </div>

          <div className="glass rounded-[24px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon name="file" size={15} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">关于页内容</h2>
                  <p className="text-[0.66rem] text-muted">支持 Markdown</p>
                </div>
              </div>
              <button type="button" className="chip" onClick={() => setPreview((value) => !value)}>
                <Icon name={preview ? "pencil" : "eye"} size={12} />
                {preview ? "编辑" : "预览"}
              </button>
            </div>

            {preview ? (
              <div className="min-h-[260px] rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_45%,transparent)] p-5">
                <div className="prose-zag" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.about_content) }} />
              </div>
            ) : (
              <textarea
                className="field min-h-[260px] font-mono !text-[0.8rem] !leading-relaxed"
                value={form.about_content}
                onChange={(event) => update("about_content", event.target.value)}
              />
            )}
          </div>

          <div className="glass rounded-[24px] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="mail" size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold">页脚与联系方式</h2>
                <p className="text-[0.66rem] text-muted">显示在页脚和关于页</p>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <AdminField label="页脚标语" className="sm:col-span-2">
                <input
                  className="field"
                  value={form.footer_tagline}
                  onChange={(event) => update("footer_tagline", event.target.value)}
                />
              </AdminField>
              <AdminField label="GitHub 链接">
                <input
                  className="field font-mono !text-xs"
                  value={form.github_url}
                  onChange={(event) => update("github_url", event.target.value)}
                  placeholder="https://github.com/…"
                />
              </AdminField>
              <AdminField label="联系邮箱">
                <input
                  className="field font-mono !text-xs"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="you@example.com"
                />
              </AdminField>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="admin-editor glass rounded-[24px] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="key" size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold">安全 · 进入指令</h2>
                <p className="text-[0.66rem] text-muted">
                  {hasCustomCode ? "当前：自定义指令（存于 D1）" : "当前：环境变量指令"}
                </p>
              </div>
            </div>

            <form onSubmit={changeCode} className="space-y-3">
              <AdminField label="当前指令">
                <input
                  type="password"
                  className="field font-mono !text-xs"
                  value={currentCode}
                  onChange={(event) => setCurrentCode(event.target.value)}
                  autoComplete="current-password"
                  placeholder="输入当前使用的指令"
                />
              </AdminField>
              <AdminField label="新指令" hint="6-64 个字符，建议包含字母与数字">
                <input
                  type="password"
                  className="field font-mono !text-xs"
                  value={newCode}
                  onChange={(event) => setNewCode(event.target.value)}
                  autoComplete="new-password"
                  placeholder="新的专属指令"
                />
              </AdminField>
              <AdminField label="确认新指令">
                <input
                  type="password"
                  className="field font-mono !text-xs"
                  value={confirmCode}
                  onChange={(event) => setConfirmCode(event.target.value)}
                  autoComplete="new-password"
                  placeholder="再输入一次"
                />
              </AdminField>
              <button
                type="submit"
                className="btn w-full"
                disabled={changingCode || !currentCode || !newCode}
              >
                {changingCode ? (
                  <Icon name="loader" size={15} className="animate-spin" />
                ) : (
                  <Icon name="lock" size={15} />
                )}
                {changingCode ? "更新中…" : "更新进入指令"}
              </button>
            </form>

            <p className="mt-3 text-[0.66rem] leading-relaxed text-muted">
              更新后其他设备上的后台会话会立即失效。指令只保存加盐后的哈希，不保存明文。
            </p>
          </div>

          <div className="glass rounded-[24px] p-5">
            <h2 className="text-sm font-semibold">内容存储</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <Icon name="database" size={14} className="text-[var(--accent)]" />
                D1 · zag-blog-db
                <span className="ml-auto text-[var(--accent-3)]">已连接</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="cloud" size={14} className="text-[var(--accent)]" />
                R2 · zag-blog-r2
                <span className="ml-auto text-[var(--accent-3)]">已连接</span>
              </div>
            </div>
            <div className="divider my-3" />
            <p className="text-[0.66rem] leading-relaxed text-muted">
              媒体文件通过 <code className="font-mono">/api/media/…</code> 输出，
              带一年缓存与 Range 支持。
            </p>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}