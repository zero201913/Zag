"use client";

import { useEffect, useState } from "react";
import {
  PALETTES,
  type AppearanceColors,
  type AppearanceSettings,
} from "@/lib/appearance";
import type { BackgroundOption } from "@/lib/types";
import { Icon } from "./icons";

export function AppearancePanel({
  open,
  isAdmin,
  settings,
  onClose,
  onUpdate,
  onUpdateColor,
  onReset,
}: {
  open: boolean;
  isAdmin: boolean;
  settings: AppearanceSettings;
  onClose: () => void;
  onUpdate: (patch: Partial<AppearanceSettings>) => void;
  onUpdateColor: (key: keyof AppearanceColors, value: string) => void;
  onReset: () => void;
}) {
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);
  const [backgroundsLoading, setBackgroundsLoading] = useState(false);
  const [backgroundsError, setBackgroundsError] = useState("");

  useEffect(() => {
    if (!open || isAdmin) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, isAdmin, onClose]);

  useEffect(() => {
    if (!open || isAdmin) return;
    const controller = new AbortController();
    setBackgroundsLoading(true);
    setBackgroundsError("");
    fetch("/api/backgrounds", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return response.json() as Promise<{ backgrounds?: BackgroundOption[] }>;
      })
      .then((data) => {
        const list = Array.isArray(data.backgrounds) ? data.backgrounds : [];
        setBackgrounds(list);
        if (
          settings.background !== "default" &&
          !list.some((item) => item.url === settings.background)
        ) {
          onUpdate({ background: "default" });
        }
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setBackgroundsError("读取背景图片失败，请稍后重试。");
        }
      })
      .finally(() => setBackgroundsLoading(false));

    return () => controller.abort();
  }, [open, isAdmin]);

  if (!open || isAdmin) return null;

  return (
    <>
      <div className="appearance-overlay" onClick={onClose} />
      <aside
        className="appearance-panel glass-strong"
        role="dialog"
        aria-modal="true"
        aria-label="外观测试设置"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Appearance Lab
            </span>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">背景与配色</h2>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-muted">
              测试功能 · 仅本地预览，不会部署或推送
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭外观设置">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="divider my-4" />

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">背景</span>
            <span className="text-[0.66rem] text-muted">
              {settings.background === "default" ? "默认极光" : "自定义图片"}
            </span>
          </div>
          <div className="appearance-bg-grid">
            <button
              type="button"
              className={`appearance-bg-card ${settings.background === "default" ? "is-active" : ""}`}
              onClick={() => onUpdate({ background: "default" })}
            >
              <span className="appearance-bg-default" />
              <span className="appearance-bg-label">默认极光</span>
            </button>
            {backgrounds.map((background) => (
              <button
                key={background.id}
                type="button"
                className={`appearance-bg-card ${settings.background === background.url ? "is-active" : ""}`}
                onClick={() => onUpdate({ background: background.url })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={background.url} alt="" loading="lazy" />
                <span className="appearance-bg-label">{background.name}</span>
              </button>
            ))}
          </div>
          {backgroundsLoading && (
            <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-muted">
              <Icon name="loader" size={12} className="animate-spin" />
              正在读取 R2 背景…
            </p>
          )}
          {backgroundsError && (
            <p className="mt-2 text-[0.68rem] text-red-400">{backgroundsError}</p>
          )}
          {!backgroundsLoading && !backgroundsError && backgrounds.length === 0 && (
            <p className="mt-2 text-[0.68rem] text-muted">
              还没有自定义背景，去后台「背景」页上传即可出现在这里。
            </p>
          )}

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label !mb-0">背景朦胧</span>
              <span className="font-mono text-[0.66rem] text-[var(--accent)]">
                {settings.blur}px
              </span>
            </div>
            <input
              type="range"
              className="seek"
              min={0}
              max={40}
              step={1}
              value={settings.blur}
              disabled={settings.background === "default"}
              onChange={(event) => onUpdate({ blur: Number(event.target.value) })}
              style={{ ["--progress" as string]: `${(settings.blur / 40) * 100}%` }}
              aria-label="背景朦胧程度"
            />
            <p className="mt-1 text-[0.66rem] text-muted">
              {settings.background === "default"
                ? "选择一张测试背景后可调整模糊程度。"
                : "数值越大，背景越朦胧；0 为清晰原图。"}
            </p>
          </div>
        </section>

        <div className="divider my-4" />

        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">配色</span>
            <span className="text-[0.66rem] text-muted">
              {settings.palette === "custom" ? "自定义" : PALETTES.find((p) => p.id === settings.palette)?.label}
            </span>
          </div>
          <div className="appearance-palette-grid">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                className={`appearance-palette ${settings.palette === palette.id ? "is-active" : ""}`}
                onClick={() => onUpdate({ palette: palette.id })}
              >
                <span className="appearance-swatches">
                  <span style={{ background: palette.colors.accent }} />
                  <span style={{ background: palette.colors.accent2 }} />
                  <span style={{ background: palette.colors.accent3 }} />
                </span>
                {palette.label}
              </button>
            ))}
            <button
              type="button"
              className={`appearance-palette ${settings.palette === "custom" ? "is-active" : ""}`}
              onClick={() => onUpdate({ palette: "custom" })}
            >
              <span className="appearance-swatches">
                <span style={{ background: settings.colors.accent }} />
                <span style={{ background: settings.colors.accent2 }} />
                <span style={{ background: settings.colors.accent3 }} />
              </span>
              自定义
            </button>
          </div>

          <div className="appearance-colors mt-3">
            {(
              [
                ["accent", "主色"],
                ["accent2", "辅色"],
                ["accent3", "点缀"],
              ] as Array<[keyof AppearanceColors, string]>
            ).map(([key, label]) => (
              <label key={key} className="appearance-color">
                <span>{label}</span>
                <input
                  type="color"
                  value={settings.colors[key]}
                  onChange={(event) => onUpdateColor(key, event.target.value)}
                  aria-label={`选择${label}`}
                />
              </label>
            ))}
          </div>
        </section>

        <div className="divider my-4" />

        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost !px-3 !text-xs" onClick={onReset}>
            <Icon name="refresh" size={13} />
            恢复默认
          </button>
          <button type="button" className="btn btn-primary !px-4 !text-xs" onClick={onClose}>
            <Icon name="check" size={14} />
            完成
          </button>
        </div>
      </aside>
    </>
  );
}