"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Photo } from "@/lib/types";
import { photoGridUrl } from "@/lib/utils";
import { Icon } from "./icons";
import { LazyImage } from "./lazy-image";

// 灯箱按需加载：没点开照片之前不下载查看器的 JS
const PhotoViewer = dynamic(
  () => import("./photo-viewer").then((module) => module.PhotoViewer),
  { ssr: false },
);

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <figure
            key={photo.id}
            id={`photo-${photo.id}`}
            className={`photo-item reveal ${photo.blurred ? "thumb-mask" : ""}`}
            style={{ ["--i" as string]: index }}
            onClick={() => setSelected(index)}
          >
            <LazyImage
              src={photoGridUrl(photo)}
              alt={photo.title || "照片"}
              priority={index < 2}
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
            />
            {photo.blurred && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-md">
                  <Icon name="eye-off" size={17} />
                </span>
                <span className="text-[0.6rem] font-medium tracking-[0.08em] text-white/85">
                  内容已模糊
                </span>
              </div>
            )}
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

      {selected !== null && (
        <PhotoViewer
          photos={photos}
          index={selected}
          onClose={() => setSelected(null)}
          onIndexChange={setSelected}
        />
      )}
    </>
  );
}