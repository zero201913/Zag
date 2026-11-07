"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  readAppearance,
  saveAppearance,
  type AppearanceColors,
  type AppearanceSettings,
} from "@/lib/appearance";
import { AppearancePanel } from "./appearance-panel";

interface AppearanceContextValue {
  settings: AppearanceSettings;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  update: (patch: Partial<AppearanceSettings>) => void;
  updateColor: (key: keyof AppearanceColors, value: string) => void;
  reset: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = (pathname ?? "").startsWith("/admin");
  const [settings, setSettings] = useState<AppearanceSettings>(() =>
    typeof window === "undefined" ? DEFAULT_APPEARANCE : readAppearance(),
  );
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    applyAppearance(settings, isAdmin);
    if (!isAdmin) saveAppearance(settings);
  }, [settings, isAdmin]);

  // 自定义背景被后台删除后，回到前台时自动回退默认背景
  useEffect(() => {
    if (isAdmin || settings.background === "default") return;
    const controller = new AbortController();
    const selected = settings.background;
    fetch("/api/backgrounds", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return response.json() as Promise<{ backgrounds?: Array<{ url: string }> }>;
      })
      .then((data) => {
        const list = Array.isArray(data.backgrounds) ? data.backgrounds : [];
        if (!list.some((item) => item.url === selected)) {
          setSettings((current) =>
            current.background === selected ? { ...current, background: "default" } : current,
          );
        }
      })
      .catch(() => {
        /* 网络失败时保留当前背景，等待用户打开面板重试 */
      });
    return () => controller.abort();
  }, [isAdmin, settings.background]);

  useEffect(() => {
    setPanelOpen(false);
  }, [pathname]);

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const updateColor = useCallback((key: keyof AppearanceColors, value: string) => {
    setSettings((current) => ({
      ...current,
      palette: "custom",
      colors: { ...current.colors, [key]: value },
    }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_APPEARANCE);
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      settings,
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      update,
      updateColor,
      reset,
    }),
    [settings, panelOpen, update, updateColor, reset],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
      <AppearancePanel
        open={panelOpen}
        isAdmin={isAdmin}
        settings={settings}
        onClose={() => setPanelOpen(false)}
        onUpdate={update}
        onUpdateColor={updateColor}
        onReset={reset}
      />
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used inside AppearanceProvider");
  return context;
}