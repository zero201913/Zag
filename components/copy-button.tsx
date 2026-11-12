"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

async function writeClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 回退到 execCommand */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 复制一段文本。站内相对路径会自动补成完整地址，方便直接贴进文章。
 */
export function CopyButton({
  value,
  label = "复制链接",
  copiedLabel = "已复制",
  className = "btn btn-ghost",
  absolute = true,
  onCopied,
  onError,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  absolute?: boolean;
  onCopied?: () => void;
  onError?: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    const text =
      absolute && value.startsWith("/") ? `${window.location.origin}${value}` : value;
    const ok = await writeClipboard(text);
    if (!ok) {
      onError?.("复制失败，请手动选择文本");
      return;
    }
    setCopied(true);
    onCopied?.();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => void handleCopy()}
      title={label}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      {copied ? copiedLabel : label}
    </button>
  );
}