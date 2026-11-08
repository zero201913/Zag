"use client";

import { useEffect, useState } from "react";

/** 访问任意页面加 ?fps=1 显示实时帧率，方便手动验证滚动流畅度。 */
export function FpsMeter() {
  const [enabled, setEnabled] = useState(false);
  const [fps, setFps] = useState(0);
  const [minFps, setMinFps] = useState(0);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("fps")) return;
    setEnabled(true);

    let frames = 0;
    let last = performance.now();
    let min = Number.POSITIVE_INFINITY;
    let raf = 0;

    const loop = (now: number) => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= 500) {
        const value = Math.round((frames * 1000) / elapsed);
        setFps(value);
        min = Math.min(min, value);
        setMinFps(min);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!enabled) return null;

  return (
    <div className="fps-meter" role="status" aria-live="off">
      <span>{fps} FPS</span>
      <span className="fps-meter-min">min {minFps}</span>
    </div>
  );
}