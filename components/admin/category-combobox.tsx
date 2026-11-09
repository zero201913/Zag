"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { UNCATEGORIZED } from "@/lib/categories";
import { Icon } from "../icons";

interface CategoryComboboxProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
}

/**
 * 可搜索、可新建的分类下拉框。
 * 输入会过滤已有分类；没有匹配项时可以直接回车新建。
 */
export function CategoryCombobox({
  value,
  options,
  onChange,
  placeholder = "选择或输入分类",
  className = "",
  inputClassName = "field",
  ariaLabel = "分类",
}: CategoryComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery(value);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, value]);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const needle = trimmed.toLocaleLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLocaleLowerCase().includes(needle));
  }, [options, trimmed]);

  const canCreate =
    trimmed.length > 0 &&
    !options.some((option) => option.toLocaleLowerCase() === trimmed.toLocaleLowerCase());
  const entries = canCreate ? [...filtered, trimmed] : filtered;
  const newEntryIndex = canCreate ? filtered.length : -1;

  function commit(nextValue: string) {
    const next = nextValue.trim() || UNCATEGORIZED;
    setQuery(next);
    setOpen(false);
    setHighlight(0);
    if (next !== value) onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      if (!entries.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((current) => (current + step + entries.length) % entries.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && entries[highlight]) commit(entries[highlight]);
      else commit(query);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(value);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        className={inputClassName}
        value={query}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          const index = entries.findIndex((entry) => entry === value);
          setHighlight(index >= 0 ? index : 0);
        }}
        onBlur={() => {
          setOpen(false);
          commit(query);
        }}
        onKeyDown={handleKeyDown}
      />
      <Icon
        name="chevron-down"
        size={12}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 max-h-56 w-full min-w-[11rem] overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {entries.length === 0 && (
            <p className="px-2.5 py-2 text-[0.7rem] text-muted">
              输入分类名称后按回车新建
            </p>
          )}
          {entries.map((entry, index) => {
            const isNew = index === newEntryIndex;
            const selected = !isNew && entry === value;
            const active = index === highlight;
            return (
              <button
                key={isNew ? `new:${entry}` : entry}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.78rem] transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text)] hover:bg-[var(--glass-soft)]"
                }`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(entry);
                }}
              >
                <Icon
                  name={isNew ? "plus" : entry === UNCATEGORIZED ? "folder" : "tag"}
                  size={12}
                  className="shrink-0 opacity-70"
                />
                <span className="min-w-0 flex-1 truncate">{entry}</span>
                {isNew && (
                  <span className="shrink-0 text-[0.62rem] font-semibold text-[var(--accent)]">
                    新建
                  </span>
                )}
                {selected && <Icon name="check" size={11} className="shrink-0" />}
              </button>
            );
          })}
          <p className="mt-1 border-t border-[var(--border)] px-2.5 pb-0.5 pt-1.5 text-[0.62rem] text-muted">
            输入可检索 · 回车选择或新建
          </p>
        </div>
      )}
    </div>
  );
}