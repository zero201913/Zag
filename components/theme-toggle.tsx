"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { THEME_STORAGE_KEY } from "./theme-script";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-btn"
      aria-label={dark ? "切换到白天模式" : "切换到黑夜模式"}
      title={dark ? "白天模式" : "黑夜模式"}
    >
      <Icon name={mounted && dark ? "sun" : "moon"} size={17} />
    </button>
  );
}