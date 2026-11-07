"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/types";
import { formatDuration, mediaUrl } from "@/lib/utils";
import { Icon } from "./icons";

export function MusicPlayer({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(tracks[0]?.duration ?? 0);
  const [volume, setVolume] = useState(0.8);

  const current = tracks[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    setProgress(0);
    setDuration(tracks[currentIndex]?.duration ?? 0);
  }, [currentIndex, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, currentIndex]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function selectTrack(index: number) {
    if (index === currentIndex) {
      setPlaying((value) => !value);
      return;
    }
    setCurrentIndex(index);
    setPlaying(true);
  }

  function next() {
    setCurrentIndex((index) => (index + 1) % tracks.length);
  }

  function prev() {
    setCurrentIndex((index) => (index - 1 + tracks.length) % tracks.length);
  }

  if (!current) return null;

  const percent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="glass rounded-[32px] p-5 sm:p-7">
      <div className="player-shell">
        <div>
          <div className={`album-art ${playing ? "is-playing" : ""}`}>
            {current.cover_key ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(current.cover_key)} alt={current.title} />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-white/90">
                <Icon name="music" size={44} />
                <span className="mt-3 text-xs uppercase tracking-[0.24em] opacity-70">
                  ZAG PLAYLIST
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 to-transparent p-4">
              <span className="chip !border-white/20 !bg-white/10 !text-white/90 backdrop-blur-md">
                {playing ? "正在播放" : "已暂停"}
              </span>
              <span className="font-mono text-[0.68rem] text-white/70">
                {String(currentIndex + 1).padStart(2, "0")} / {String(tracks.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button type="button" className="icon-btn" onClick={prev} aria-label="上一首">
              <Icon name="skip-back" size={18} />
            </button>
            <button
              type="button"
              className="icon-btn !h-14 !w-14 !border-transparent !bg-[var(--accent)] !text-white shadow-[0_16px_40px_-14px_var(--accent)]"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "暂停" : "播放"}
            >
              <Icon name={playing ? "pause" : "play"} size={22} />
            </button>
            <button type="button" className="icon-btn" onClick={next} aria-label="下一首">
              <Icon name="skip-forward" size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Now Playing
          </span>
          <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.03em]">
            {current.title}
          </h2>
          <p className="mt-1 truncate text-sm text-muted">
            {current.artist || "未知艺术家"}
            {current.album ? ` · ${current.album}` : ""}
          </p>

          <div className="mt-6">
            <input
              type="range"
              className="seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(progress, duration || 0)}
              onChange={(event) => {
                const value = Number(event.target.value);
                setProgress(value);
                if (audioRef.current) audioRef.current.currentTime = value;
              }}
              style={{ ["--progress" as string]: `${percent}%` }}
              aria-label="播放进度"
            />
            <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-muted">
              <span>{formatDuration(progress)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-muted">
            <Icon name="volume" size={16} />
            <input
              type="range"
              className="seek max-w-[120px]"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              style={{ ["--progress" as string]: `${volume * 100}%` }}
              aria-label="音量"
            />
          </div>

          <div className="divider my-5" />

          <div className="min-h-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">
                播放列表
              </p>
              <span className="text-[0.68rem] text-muted">{tracks.length} 首</span>
            </div>
            <div className="max-h-[260px] space-y-1 overflow-y-auto pr-1">
              {tracks.map((track, index) => (
                <button
                  key={track.id}
                  id={`track-${track.id}`}
                  type="button"
                  className="track-row"
                  data-active={index === currentIndex}
                  onClick={() => selectTrack(index)}
                >
                  <span className="w-5 shrink-0 text-center font-mono text-[0.68rem] text-muted">
                    {index === currentIndex && playing ? (
                      <span className="inline-block animate-pulse">▶</span>
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{track.title}</span>
                    <span className="block truncate text-[0.7rem] text-muted">
                      {track.artist || "未知艺术家"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[0.68rem] text-muted">
                    {formatDuration(track.duration)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={mediaUrl(current.r2_key)}
        preload="metadata"
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onEnded={next}
      />
    </div>
  );
}