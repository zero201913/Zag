"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { UploadButton } from "./upload-button";
import { Icon } from "../icons";
import { apiRequest } from "@/lib/admin-client";
import {
  DEFAULT_APPEARANCE,
  readAppearance,
  saveAppearance,
} from "@/lib/appearance";
import type { Background } from "@/lib/types";
import { formatShortDate, mediaUrl } from "@/lib/utils";

export function BackgroundsManager({ initial }: { initial: Background[] }) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentBackground, setCurrentBackground] = useState("default");
  const { toast, show } = useToast();

  useEffect(() => {
    setCurrentBackground(readAppearance().background);
  }, []);

  async function handleUploaded(result: { key: string }) {
    const displayName = name.trim() || "未命名背景";
    setUploading(true);
    try {
      const data = await apiRequest<{ item: Background }>("/api/admin/backgrounds", {
        method: "POST",
        body: JSON.stringify({ name: displayName, r2_key: result.key }),
      });
      setItems((list) =>
        [...list, data.item].sort((a, b) => a.sort_order - b.sort_order),
      );
      setName("");
      show("背景已上传，外观面板会自动读取");
    } catch (error) {
      show((error as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(background: Background) {
    if (!window.confirm(`确定删除背景「${background.name}」吗？R2 文件也会被删除。`)) return;
    try {
      await apiRequest(`/api/admin/backgrounds/${background.id}`, { method: "DELETE" });
      setItems((list) => list.filter((item) => item.id !== background.id));
      const appearance = readAppearance();
      if (appearance.background === mediaUrl(background.r2_key)) {
        saveAppearance({ ...DEFAULT_APPEARANCE, colors: appearance.colors });
        setCurrentBackground("default");
      }
      show("背景已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="背景图库"
        description="上传到 R2 的 backgrounds/ 目录；前台「背景与配色」面板会从 D1 + R2 读取。"
        action={
          <span className="chip">
            <Icon name="image" size={13} />
            {items.length} 张背景
          </span>
        }
      />

      <div className="glass mb-4 rounded-[24px] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="label">背景名称</span>
            <input
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：花海、夜色、工作室窗边"
            />
          </label>
          <UploadButton
            kind="background"
            label={uploading ? "正在保存…" : "上传背景"}
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="btn btn-primary shrink-0"
            onUploaded={(result) => void handleUploaded(result)}
            onError={(message) => show(message, "error")}
          />
        </div>
        <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">
          图片会先在浏览器压缩为 WebP，再上传到 R2；建议使用横向图片（16:9 左右）。
        </p>
      </div>

      {items.length === 0 ? (
        <div className="glass-soft rounded-[26px] px-6 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon name="image" size={24} />
          </span>
          <h3 className="mt-4 text-base font-semibold">背景图库还是空的</h3>
          <p className="mt-1 text-sm text-muted">上传一张图片，它会出现在前台外观面板里。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((background, index) => (
            <BackgroundCard
              key={background.id}
              background={background}
              index={index}
              current={currentBackground === mediaUrl(background.r2_key)}
              onDeleted={() => void handleDelete(background)}
              onSaved={(item) => {
                setItems((list) =>
                  list.map((entry) => (entry.id === item.id ? item : entry)),
                );
                show("背景名称已更新");
              }}
              onError={(message) => show(message, "error")}
              onCopied={() => show("背景 URL 已复制")}
            />
          ))}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

function BackgroundCard({
  background,
  index,
  current,
  onDeleted,
  onSaved,
  onError,
  onCopied,
}: {
  background: Background;
  index: number;
  current: boolean;
  onDeleted: () => void;
  onSaved: (item: Background) => void;
  onError: (message: string) => void;
  onCopied: () => void;
}) {
  const [name, setName] = useState(background.name);
  const [saving, setSaving] = useState(false);
  const url = mediaUrl(background.r2_key);

  async function saveName() {
    const nextName = name.trim();
    if (!nextName || nextName === background.name) return;
    setSaving(true);
    try {
      const data = await apiRequest<{ item: Background }>(
        `/api/admin/backgrounds/${background.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ name: nextName }),
        },
      );
      onSaved(data.item);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className="glass card reveal !p-0 overflow-hidden"
      style={{ ["--i" as string]: index }}
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={background.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {current && (
          <span className="chip chip-accent absolute left-3 top-3 backdrop-blur-md">
            当前使用
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <input
            className="field !py-2 !text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => void saveName()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveName();
              }
            }}
            aria-label="背景名称"
          />
          <button
            type="button"
            className="icon-btn shrink-0"
            onClick={() => void saveName()}
            disabled={saving || name.trim() === background.name}
            aria-label="保存背景名称"
          >
            <Icon name={saving ? "loader" : "check"} size={14} className={saving ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[0.66rem] text-muted">
          <span>{formatShortDate(background.created_at)}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              onClick={() => {
                void navigator.clipboard?.writeText(`${location.origin}${url}`);
                onCopied();
              }}
              aria-label="复制背景 URL"
              title="复制背景 URL"
            >
              <Icon name="external" size={14} />
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-400"
              onClick={onDeleted}
              aria-label="删除背景"
              title="删除背景"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}