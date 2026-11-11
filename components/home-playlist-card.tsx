"use client";

import Link from "next/link";
import { useEffect } from "react";
import { categoryText } from "@/lib/categories";
import type { Track } from "@/lib/types";
import { Icon } from "./icons";
import { useMusic } from "./music-provider";
import { PlaylistWave } from "./playlist-wave";

export function HomePlaylistCard({ tracks }: { tracks: Track[] }) {
  const { current, queue, playing, hydrateTracks, next, prev } = useMusic();

  useEffect(() => {
    hydrateTracks(tracks);
  }, [tracks, hydrateTracks]);

  const track = current ?? tracks[0] ?? null;
  const album = track ? categoryText(track.album, "未分类") : "";
  const queueLength = queue.length || tracks.length;
  const canStep = queueLength > 1;

  return (
    <div className="home-playlist-card card glass reveal relative overflow-hidden !p-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,var(--accent),transparent_55%),radial-gradient(100%_100%_at_100%_100%,var(--accent-2),transparent_55%)] opacity-30" />

      <div className="relative flex h-full min-h-[230px] flex-col justify-between p-7">
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Playlist
          </span>
          <Link
            href="/music"
            className="text-[var(--accent)] transition-transform hover:-translate-y-0.5"
            aria-label="打开音乐页"
            title="打开音乐页"
          >
            <Icon name="music" size={18} />
          </Link>
        </div>

        <div className="home-playlist-wave-row">
          <PlaylistWave />
          <div className="home-playlist-album" title={album || "暂无专辑"}>
            <span className="home-playlist-album-label">专辑</span>
            <span className="home-playlist-album-name">{album || "暂无专辑"}</span>
          </div>
        </div>

        <div>
          <div className="home-playlist-title-row">
            <div className="min-w-0">
              <p
                className="truncate text-xl font-semibold tracking-[-0.03em]"
                title={track?.title ?? undefined}
              >
                {track?.title ?? "还没有上传音乐"}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {track
                  ? `${track.artist || "未知艺术家"}${playing ? " · 正在播放" : ""}`
                  : "去后台把喜欢的歌放进来"}
              </p>
            </div>

            <div className="home-playlist-nav">
              <button
                type="button"
                className="icon-btn"
                onClick={prev}
                disabled={!canStep}
                aria-label="上一首"
                title="上一首"
              >
                <Icon name="skip-back" size={14} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={next}
                disabled={!canStep}
                aria-label="下一首"
                title="下一首"
              >
                <Icon name="skip-forward" size={14} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href="/music"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]"
            >
              打开播放器
              <Icon name="arrow-right" size={14} />
            </Link>
            {tracks.length > 0 && (
              <span className="text-[0.66rem] text-muted">{tracks.length} 首</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}