"use client";

import type { CSSProperties } from "react";
import { useMusic } from "./music-provider";

/**
 * 首页 Playlist 卡片的动态音乐光波。
 * 只用 CSS transform 动画（20 个 span），播放时才启动，
 * 暂停时完全静止，滚动和渲染开销都接近零。
 */
export function PlaylistWave({ bars = 20 }: { bars?: number }) {
  const { playing } = useMusic();

  return (
    <div
      className={`playlist-wave${playing ? " is-playing" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }, (_, index) => {
        const base = 0.3 + 0.62 * Math.abs(Math.sin((index + 1) * 1.73));
        const delay = -((index * 0.37) % 1.1);
        return (
          <span
            key={index}
            style={
              {
                "--wave-base": base.toFixed(2),
                "--wave-delay": `${delay.toFixed(2)}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}