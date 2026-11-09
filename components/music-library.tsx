"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Track } from "@/lib/types";
import { UNCATEGORIZED, normalizeCategory } from "@/lib/categories";
import { formatDuration, mediaUrl } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { Icon } from "./icons";
import { useMusic } from "./music-provider";

const UNKNOWN_ALBUM = "未分类专辑";

function albumGroupOf(track: Track) {
  const normalized = normalizeCategory(track.album);
  return normalized === UNCATEGORIZED ? UNKNOWN_ALBUM : normalized;
}

function albumTextOf(track: Track) {
  const normalized = normalizeCategory(track.album);
  return normalized === UNCATEGORIZED ? "" : normalized;
}

export function MusicLibrary({ initialTracks }: { initialTracks: Track[] }) {
  const {
    tracks,
    current,
    playing,
    progress,
    duration,
    volume,
    hydrateTracks,
    playQueue,
    playTrack,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    isCurrent,
  } = useMusic();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  useEffect(() => {
    hydrateTracks(initialTracks);
  }, [initialTracks, hydrateTracks]);

  const library = initialTracks.length ? initialTracks : tracks;

  const albums = useMemo(() => {
    const groups = new Map<string, Track[]>();
    for (const track of library) {
      const album = albumGroupOf(track);
      const list = groups.get(album) ?? [];
      list.push(track);
      groups.set(album, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === UNKNOWN_ALBUM) return 1;
      if (b === UNKNOWN_ALBUM) return -1;
      return a.localeCompare(b, "zh-CN");
    });
  }, [library]);

  const active = selectedAlbum
    ? albums.find(([name]) => name === selectedAlbum) ?? null
    : null;
  const visibleTracks = active ? active[1] : library;

  if (!library.length) {
    return (
      <EmptyState
        icon="music"
        title="音乐库还是空的"
        description="去后台上传第一首歌。带内嵌封面的 MP3 会自动识别封面，也可以手动上传。"
        actionHref="/admin/music"
        actionLabel="管理音乐资源"
      />
    );
  }

  return (
    <div className="space-y-8">
      <NowPlaying
        current={current}
        playing={playing}
        progress={progress}
        duration={duration}
        volume={volume}
        onToggle={() => void toggle()}
        onPrev={prev}
        onNext={next}
        onSeek={seek}
        onVolume={setVolume}
      />

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" />
              Albums
            </span>
            <h2 className="section-title mt-2">音乐包</h2>
          </div>
          <p className="hidden text-right text-xs leading-relaxed text-muted sm:block">
            自动读取 MP3 内嵌封面与标签，
            <br />
            按专辑归好，点开即播。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map(([name, items], index) => {
            const first = items.find((item) => item.cover_key) ?? items[0];
            const artists = Array.from(
              new Set(items.map((item) => item.artist.trim()).filter(Boolean)),
            ).join(" / ");
            const activeAlbum = active?.[0] === name;
            const hasCurrent = items.some((item) => item.id === current?.id);

            return (
              <button
                key={name}
                type="button"
                className={`glass card card-hover reveal group !p-0 overflow-hidden text-left ${
                  activeAlbum ? "border-[var(--accent)]" : ""
                }`}
                style={{ ["--i" as string]: index }}
                onClick={() => {
                  setSelectedAlbum(name);
                  playQueue(items);
                }}
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {first?.cover_key ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(first.cover_key)}
                      alt={name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_0%_0%,color-mix(in_srgb,var(--accent)_55%,transparent),transparent_58%),radial-gradient(100%_100%_at_100%_100%,color-mix(in_srgb,var(--accent-2)_55%,transparent),transparent_58%),var(--surface-2)]">
                      <span className="cover-letter !text-5xl !text-[var(--cover-ink)]">
                        {name.slice(0, 1)}
                      </span>
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <span className="chip !border-white/25 !bg-black/30 !text-white backdrop-blur-md">
                      <Icon name="play" size={10} />
                      {items.length} 首
                    </span>
                    {hasCurrent && (
                      <span className="chip !border-white/25 !bg-black/30 !text-white backdrop-blur-md">
                        {playing ? "播放中" : "已暂停"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-base font-semibold tracking-[-0.02em]">{name}</h3>
                  <p className="mt-1 truncate text-xs text-muted">
                    {artists || "未知艺术家"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-[26px] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              {active ? active[0] : "全部曲目"}
            </h2>
            <p className="text-xs text-muted">
              {visibleTracks.length} 首 · {active ? "当前音乐包" : "按专辑整理的完整列表"}
            </p>
          </div>
          <div className="flex gap-2">
            {active && (
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-1.5 !text-xs"
                onClick={() => setSelectedAlbum(null)}
              >
                全部专辑
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary !px-3 !py-1.5 !text-xs"
              onClick={() => playQueue(visibleTracks)}
            >
              <Icon name="play" size={13} />
              播放全部
            </button>
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {visibleTracks.map((track, index) => {
            const currentTrack = isCurrent(track.id);
            const albumText = albumTextOf(track);
            return (
              <button
                key={track.id}
                id={`track-${track.id}`}
                type="button"
                className="track-row !rounded-none !px-2 !py-3"
                data-active={currentTrack}
                onClick={() => playTrack(track.id, visibleTracks)}
              >
                <span className="w-6 shrink-0 text-center font-mono text-[0.68rem] text-muted">
                  {currentTrack && playing ? (
                    <span className="inline-block animate-pulse">▶</span>
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-soft)] text-[var(--accent)]">
                  {track.cover_key ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(track.cover_key)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="music" size={15} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{track.title}</span>
                  <span className="block truncate text-[0.7rem] text-muted">
                    {track.artist || "未知艺术家"}
                    {albumText ? ` · ${albumText}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[0.68rem] text-muted">
                  {formatDuration(track.duration)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="glass-soft flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 text-xs text-muted">
        <Icon name="cloud" size={15} className="text-[var(--accent)]" />
        <span>音频存放在 Cloudflare R2，全局播放器在页面切换时不会中断。</span>
        <Link
          href="/admin/music"
          className="ml-auto inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] transition-opacity hover:opacity-80"
        >
          <Icon name="lock" size={12} />
          管理音乐资源
        </Link>
      </div>
    </div>
  );
}

function NowPlaying({
  current,
  playing,
  progress,
  duration,
  volume,
  onToggle,
  onPrev,
  onNext,
  onSeek,
  onVolume,
}: {
  current: Track | null;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolume: (value: number) => void;
}) {
  const percent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="glass rounded-[28px] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
          {current?.cover_key ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(current.cover_key)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_120%_at_10%_0%,var(--accent),transparent_60%),radial-gradient(100%_100%_at_100%_100%,var(--accent-2),transparent_60%),var(--surface-2)] text-white/80">
              <Icon name="music" size={26} />
            </div>
          )}
          {playing && <span className="absolute bottom-1.5 right-1.5 h-2 w-2 animate-pulse rounded-full bg-[var(--accent-3)]" />}
        </div>

        <div className="min-w-0 flex-1">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Now Playing
          </span>
          <p className="mt-1 truncate text-lg font-semibold tracking-[-0.02em]">
            {current?.title ?? "还没有正在播放的音乐"}
          </p>
          <p className="truncate text-xs text-muted">
            {current
              ? [current.artist || "未知艺术家", albumTextOf(current)].filter(Boolean).join(" · ")
              : "从下面的专辑或曲目里选一首"}
          </p>

          <div className="mt-3">
            <input
              type="range"
              className="seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(progress, duration || 0)}
              onChange={(event) => onSeek(Number(event.target.value))}
              style={{ ["--progress" as string]: `${percent}%` }}
              aria-label="播放进度"
            />
            <div className="mt-1 flex justify-between font-mono text-[0.66rem] text-muted">
              <span>{formatDuration(progress)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <div className="flex items-center gap-2">
            <button type="button" className="icon-btn" onClick={onPrev} aria-label="上一首">
              <Icon name="skip-back" size={17} />
            </button>
            <button
              type="button"
              className="icon-btn !h-12 !w-12 !border-transparent !bg-[var(--accent)] !text-white"
              onClick={onToggle}
              aria-label={playing ? "暂停" : "播放"}
            >
              <Icon name={playing ? "pause" : "play"} size={20} />
            </button>
            <button type="button" className="icon-btn" onClick={onNext} aria-label="下一首">
              <Icon name="skip-forward" size={17} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Icon name="volume" size={14} />
            <input
              type="range"
              className="seek max-w-[92px]"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => onVolume(Number(event.target.value))}
              style={{ ["--progress" as string]: `${volume * 100}%` }}
              aria-label="音量"
            />
          </div>
        </div>
      </div>
    </div>
  );
}