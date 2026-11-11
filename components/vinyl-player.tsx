"use client";

import { usePathname } from "next/navigation";
import { categoryText } from "@/lib/categories";
import { mediaUrl } from "@/lib/utils";
import { Icon } from "./icons";
import { useMusic } from "./music-provider";

export function VinylPlayer() {
  const pathname = usePathname();
  const { current, playing, loading, toggle, next, prev, queue, tracks } = useMusic();

  if ((pathname ?? "").startsWith("/admin")) return null;

  const cover = current?.cover_key ? mediaUrl(current.cover_key) : "";
  const album = current ? categoryText(current.album, "") : "";
  const canStep = (queue.length || tracks.length) > 1;

  return (
    <div className="vinyl-dock">
      {current && (
        <div className="vinyl-meta glass">
          <p className="truncate text-[0.7rem] font-semibold">{current.title}</p>
          <p className="truncate text-[0.62rem] text-muted">
            {current.artist || "未知艺术家"}
            {album ? ` · ${album}` : ""}
          </p>
        </div>
      )}

      <div className="vinyl-controls">
        <button
          type="button"
          className="vinyl-nav"
          onClick={prev}
          disabled={!canStep}
          aria-label="上一首"
          title="上一首"
        >
          <Icon name="skip-back" size={14} />
        </button>

        <button
          type="button"
          className={`vinyl-disc ${playing ? "is-playing" : ""}`}
          onClick={() => void toggle()}
          aria-label={playing ? "暂停音乐" : "播放音乐"}
          title={current ? `${playing ? "暂停" : "播放"}：${current.title}` : "打开音乐"}
        >
          <span className="vinyl-cover">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" decoding="async" />
            ) : (
              <span className="vinyl-fallback">
                <Icon name="music" size={18} />
              </span>
            )}
          </span>
          <span className="vinyl-hole" />
          <span className="vinyl-toggle">
            <Icon name={loading ? "loader" : playing ? "pause" : "play"} size={11} className={loading ? "animate-spin" : ""} />
          </span>
        </button>

        <button
          type="button"
          className="vinyl-nav"
          onClick={next}
          disabled={!canStep}
          aria-label="下一首"
          title="下一首"
        >
          <Icon name="skip-forward" size={14} />
        </button>
      </div>
    </div>
  );
}