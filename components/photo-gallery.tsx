"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Photo } from "@/lib/types";
import { categoryText } from "@/lib/categories";
import { clamp, formatDate, mediaUrl } from "@/lib/utils";
import { Icon } from "./icons";

interface View {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: View = { scale: 1, x: 0, y: 0 };

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const stageRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const open = selected !== null;

  const close = useCallback(() => setSelected(null), []);
  const prev = useCallback(
    () => setSelected((index) => (index === null ? null : (index - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const next = useCallback(
    () => setSelected((index) => (index === null ? null : (index + 1) % photos.length)),
    [photos.length],
  );

  function resetView() {
    setView(IDENTITY);
  }

  // 打开查看时隐藏顶部导航 / 页脚 / 黑胶，并锁定页面滚动
  useEffect(() => {
    if (!open) {
      document.body.classList.remove("lightbox-open");
      return;
    }

    document.body.classList.add("lightbox-open");
    setView(IDENTITY);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Lenis 监听的是 window 级滚轮事件，仅靠 overflow: hidden 拦不住，必须显式暂停
    window.__lenis?.stop();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
      if (event.key === "0") resetView();
      if (event.key === "+" || event.key === "=") {
        setView((current) => ({
          ...current,
          scale: clamp(current.scale * 1.25, 1, 5),
        }));
      }
      if (event.key === "-") {
        setView((current) => {
          const scale = clamp(current.scale / 1.25, 1, 5);
          return scale === 1 ? IDENTITY : { ...current, scale };
        });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("lightbox-open");
      document.body.style.overflow = previousOverflow;
      window.__lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, prev, next]);

  // 原生 wheel 监听，才能 preventDefault 防止页面滚动
  useEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    if (!stage) return;
    const element: HTMLDivElement = stage;
    const overlay = lightboxRef.current;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const cursorX = event.clientX - rect.left - rect.width / 2;
      const cursorY = event.clientY - rect.top - rect.height / 2;
      setView((current) => {
        const scale = clamp(current.scale * Math.exp(-event.deltaY * 0.0015), 1, 5);
        if (scale === current.scale) return current;
        if (scale === 1) return IDENTITY;
        const ratio = scale / current.scale;
        return {
          scale,
          x: current.x + cursorX * (1 - ratio),
          y: current.y + cursorY * (1 - ratio),
        };
      });
    }

    // 滚轮落在按钮、提示、留白区域时也不要把后面的图集页面滚走
    function onOverlayWheel(event: WheelEvent) {
      event.preventDefault();
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    overlay?.addEventListener("wheel", onOverlayWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      overlay?.removeEventListener("wheel", onOverlayWheel);
    };
  }, [open]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (view.scale <= 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setView((current) => ({
      ...current,
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    }));
  }

  function endDrag() {
    dragRef.current = null;
  }

  const current = selected !== null ? photos[selected] : null;
  const currentAlbum = current ? categoryText(current.album, "未分类") : "";

  const lightbox = current ? (
    <div
      ref={lightboxRef}
      className="lightbox"
      data-lenis-prevent=""
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="照片预览"
    >
      <div className="lightbox-hint">
        <Icon name="search" size={13} />
        滚轮缩放 · 拖动平移 · 双击复位
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <span className="chip !border-white/20 !bg-black/30 !text-white/90 backdrop-blur-md">
          {Math.round(view.scale * 100)}%
        </span>
        {view.scale > 1 && (
          <button
            type="button"
            className="icon-btn !border-white/20 !bg-black/30 !text-white"
            onClick={(event) => {
              event.stopPropagation();
              resetView();
            }}
            aria-label="复位图片"
            title="复位（0）"
          >
            <Icon name="grid" size={16} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn !border-white/20 !bg-black/30 !text-white"
          onClick={(event) => {
            event.stopPropagation();
            close();
          }}
          aria-label="退出照片查看"
          title="退出（Esc）"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox-arrow left-4"
          onClick={(event) => {
            event.stopPropagation();
            prev();
          }}
          aria-label="上一张"
        >
          <Icon name="chevron-left" size={22} />
        </button>
      )}

      <div
        ref={stageRef}
        className="lightbox-stage"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={resetView}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ cursor: view.scale > 1 ? "grab" : "default" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lightbox-image"
          src={mediaUrl(current.r2_key)}
          alt={current.title || "照片"}
          decoding="async"
          draggable={false}
          width={current.width ?? undefined}
          height={current.height ?? undefined}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          }}
        />
      </div>

      <div className="lightbox-caption" onClick={(event) => event.stopPropagation()}>
        <div className="min-w-0">
          {current.title && <p className="truncate font-semibold text-white">{current.title}</p>}
          {current.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-white/70">{current.description}</p>
          )}
        </div>
        <p className="shrink-0 text-xs text-white/60">
          {currentAlbum ? `${currentAlbum} · ` : ""}
          {selected! + 1} / {photos.length}
          {current.taken_at ? ` · ${formatDate(current.taken_at)}` : ""}
        </p>
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox-arrow right-4"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          aria-label="下一张"
        >
          <Icon name="chevron-right" size={22} />
        </button>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            id={`photo-${photo.id}`}
            className="photo-item reveal"
            style={{ ["--i" as string]: index }}
            onClick={() => setSelected(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(photo.r2_key)}
              alt={photo.title || "照片"}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
            />
            {(photo.title || photo.description) && (
              <figcaption className="photo-caption">
                {photo.title && <span className="font-semibold">{photo.title}</span>}
                {photo.description && (
                  <span className="block opacity-80">{photo.description}</span>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {lightbox && typeof document !== "undefined"
        ? createPortal(lightbox, document.body)
        : null}
    </>
  );
}