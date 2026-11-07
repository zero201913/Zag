"use client";

import { usePathname } from "next/navigation";
import { mediaUrl } from "@/lib/utils";
import { Icon } from "./icons";
import { useMusic } from "./music-provider";

export function VinylPlayer() {
  const pathname = usePathname();
  const { current, playing, loading, toggle } = useMusic();

  if ((pathname ?? "").startsWith("/admin")) return null;

  const cover = current?.cover_key ? mediaUrl(current.cover_key) : "";

  return (
    <div className="vinyl-dock">
      {current && (
        <div className="vinyl-meta glass">
          <p className="truncate text-[0.7rem] font-semibold">{current.title}</p>
          <p className="truncate text-[0.62rem] text-muted">
            {current.artist || "未知艺术家"}
            {current.album ? ` · ${current.album}` : ""}
          </p>
        </div>
      )}

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
            <img src={cover} alt="" />
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
    </div>
  );
}