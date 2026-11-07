"use client";

import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/lib/types";
import { formatDate, mediaUrl } from "@/lib/utils";
import { Icon } from "./icons";

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  const close = useCallback(() => setSelected(null), []);
  const prev = useCallback(
    () => setSelected((index) => (index === null ? null : (index - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const next = useCallback(
    () => setSelected((index) => (index === null ? null : (index + 1) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (selected === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected, close, prev, next]);

  const current = selected !== null ? photos[selected] : null;

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

      {current && (
        <div className="lightbox" onClick={close} role="dialog" aria-modal="true" aria-label="照片预览">
          <button type="button" className="icon-btn absolute right-5 top-5 !border-white/20 !bg-white/10 !text-white" onClick={close} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>

          {photos.length > 1 && (
            <button
              type="button"
              className="icon-btn absolute left-4 top-1/2 z-10 -translate-y-1/2 !border-white/20 !bg-white/10 !text-white"
              onClick={(event) => {
                event.stopPropagation();
                prev();
              }}
              aria-label="上一张"
            >
              <Icon name="chevron-left" size={20} />
            </button>
          )}

          <div className="max-w-full" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(current.r2_key)}
              alt={current.title || "照片"}
              decoding="async"
              width={current.width ?? undefined}
              height={current.height ?? undefined}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/80">
              <div>
                {current.title && <p className="font-semibold text-white">{current.title}</p>}
                {current.description && <p className="mt-0.5 text-xs">{current.description}</p>}
              </div>
              <p className="text-xs opacity-70">
                {selected! + 1} / {photos.length}
                {current.taken_at ? ` · ${formatDate(current.taken_at)}` : ""}
              </p>
            </div>
          </div>

          {photos.length > 1 && (
            <button
              type="button"
              className="icon-btn absolute right-4 top-1/2 z-10 -translate-y-1/2 !border-white/20 !bg-white/10 !text-white"
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              aria-label="下一张"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          )}
        </div>
      )}
    </>
  );
}