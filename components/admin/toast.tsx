"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState {
  message: string;
  type: "ok" | "error";
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((message: string, type: "ok" | "error" = "ok") => {
    setToast({ message, type });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-ok"}`} role="status">
      {toast.message}
    </div>
  );
}