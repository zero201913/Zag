export type PaletteId = "default" | "ocean" | "sunset" | "forest" | "rose" | "custom";

export interface AppearanceColors {
  accent: string;
  accent2: string;
  accent3: string;
}

export interface AppearanceSettings {
  background: string;
  palette: PaletteId;
  blur: number;
  colors: AppearanceColors;
}

export const APPEARANCE_STORAGE_KEY = "zag-appearance-v1";
export const BACKGROUND_URL_PREFIX = "/api/media/backgrounds/";

export const DEFAULT_COLORS: AppearanceColors = {
  accent: "#5b5bf0",
  accent2: "#ff7a59",
  accent3: "#19b8a0",
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  background: "default",
  palette: "default",
  blur: 24,
  colors: DEFAULT_COLORS,
};

export const PALETTES: Array<{
  id: PaletteId;
  label: string;
  colors: AppearanceColors;
}> = [
  { id: "default", label: "默认", colors: DEFAULT_COLORS },
  { id: "ocean", label: "海盐", colors: { accent: "#0ea5e9", accent2: "#14b8a6", accent3: "#6366f1" } },
  { id: "sunset", label: "日落", colors: { accent: "#f97316", accent2: "#ef4444", accent3: "#eab308" } },
  { id: "forest", label: "森林", colors: { accent: "#16a34a", accent2: "#0d9488", accent3: "#84cc16" } },
  { id: "rose", label: "玫瑰", colors: { accent: "#e11d48", accent2: "#db2777", accent3: "#f59e0b" } },
];

function isPalette(value: unknown): value is PaletteId {
  return (
    value === "default" ||
    value === "ocean" ||
    value === "sunset" ||
    value === "forest" ||
    value === "rose" ||
    value === "custom"
  );
}

function isBackground(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "default" || value.startsWith(BACKGROUND_URL_PREFIX))
  );
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizeAppearance(value: unknown): AppearanceSettings {
  if (!value || typeof value !== "object") return DEFAULT_APPEARANCE;
  const input = value as Partial<AppearanceSettings>;
  const colors = (input.colors ?? {}) as Partial<AppearanceColors>;
  const blur = typeof input.blur === "number" ? Math.max(0, Math.min(40, input.blur)) : 24;

  return {
    background: isBackground(input.background) ? input.background : "default",
    palette: isPalette(input.palette) ? input.palette : "default",
    blur,
    colors: {
      accent: isHex(colors.accent) ? colors.accent : DEFAULT_COLORS.accent,
      accent2: isHex(colors.accent2) ? colors.accent2 : DEFAULT_COLORS.accent2,
      accent3: isHex(colors.accent3) ? colors.accent3 : DEFAULT_COLORS.accent3,
    },
  };
}

export function readAppearance(): AppearanceSettings {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    return normalizeAppearance(JSON.parse(raw));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(settings: AppearanceSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function clearCustomColors(root: HTMLElement) {
  for (const variable of ["--accent", "--accent-2", "--accent-3", "--accent-soft", "--ring"]) {
    root.style.removeProperty(variable);
  }
}

/** 把外观设置写到 <html>，CSS 负责实际渲染。 */
export function applyAppearance(settings: AppearanceSettings, isAdmin = false) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (isAdmin) {
    root.setAttribute("data-custom-bg", "false");
    root.setAttribute("data-palette", "default");
    root.style.removeProperty("--custom-bg-image");
    clearCustomColors(root);
    return;
  }

  root.setAttribute("data-palette", settings.palette);
  clearCustomColors(root);
  if (settings.palette === "custom") {
    root.style.setProperty("--accent", settings.colors.accent);
    root.style.setProperty("--accent-2", settings.colors.accent2);
    root.style.setProperty("--accent-3", settings.colors.accent3);
    root.style.setProperty(
      "--accent-soft",
      `color-mix(in srgb, ${settings.colors.accent} 12%, transparent)`,
    );
    root.style.setProperty(
      "--ring",
      `color-mix(in srgb, ${settings.colors.accent} 30%, transparent)`,
    );
  }

  const hasCustomBackground = settings.background !== "default";
  root.setAttribute("data-custom-bg", hasCustomBackground ? "true" : "false");
  if (hasCustomBackground) {
    const safeBackground = settings.background.replace(/"/g, "%22");
    root.style.setProperty("--custom-bg-image", `url("${safeBackground}")`);
    root.style.setProperty("--custom-bg-blur", `${settings.blur}px`);
    root.style.setProperty(
      "--custom-bg-mist",
      (0.22 + (settings.blur / 40) * 0.33).toFixed(2),
    );
  } else {
    root.style.removeProperty("--custom-bg-image");
  }
}