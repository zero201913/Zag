"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { PhotoViewer } from "./photo-viewer";
import type { Photo } from "@/lib/types";
import { mediaUrl } from "@/lib/utils";

/**
 * 首页「最近的照片」：点击任意一张直接在当前页面打开查看器，不跳转到 /photos。
 */
export function HomePhotoGrid({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className={`reveal group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-left ${
              photo.blurred ? "thumb-mask" : ""
            }`}
            style={{ ["--i" as string]: index }}
            onClick={() => setSelected(index)}
            aria-label={`查看照片：${photo.title || "未命名"}${photo.blurred ? "（内容已模糊）" : ""}`}
            title={photo.title || "查看照片"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(photo.r2_key)}
              alt={photo.title || "照片"}
              loading="lazy"
              decoding="async"
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
              className={`h-full w-full object-cover ${
                photo.blurred ? "" : "transition-transform duration-700 group-hover:scale-105"
              }`}
            />
            {photo.blurred && (
              <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-md">
                  <Icon name="eye-off" size={16} />
                </span>
                <span className="text-[0.58rem] font-medium tracking-[0.08em] text-white/85">
                  内容已模糊
                </span>
              </span>
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-3 pb-2.5 pt-8 text-[0.64rem] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="truncate">{photo.title || "照片"}</span>
              <Icon name="eye" size={12} className="shrink-0" />
            </span>
          </button>
        ))}
      </div>

      <PhotoViewer
        photos={photos}
        index={selected}
        onClose={() => setSelected(null)}
        onIndexChange={setSelected}
      />
    </>
  );
}