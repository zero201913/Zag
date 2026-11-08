"use client";

import { useState } from "react";
import { Icon } from "./icons";
import type { Note } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const COLLAPSE_LIMIT = 50;

export function NoteTimeline({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="note-timeline">
      {notes.map((note, index) => (
        <NoteItem key={note.id} note={note} index={index} />
      ))}
    </div>
  );
}

function NoteItem({ note, index }: { note: Note; index: number }) {
  const [open, setOpen] = useState(false);
  const chars = Array.from(note.content);
  const overflow = chars.length > COLLAPSE_LIMIT;
  const collapsed = overflow
    ? `${chars.slice(0, COLLAPSE_LIMIT).join("").replace(/\s+$/, "")}…`
    : note.content;

  return (
    <article className="note-entry reveal" style={{ ["--i" as string]: index }}>
      <div className="note-axis" aria-hidden="true">
        <span className="note-dot" />
      </div>
      <div className={`note-paper ${open ? "is-open" : ""}`}>
        <div className="note-head">
          <time
            dateTime={new Date(note.created_at * 1000).toISOString()}
            suppressHydrationWarning
          >
            {formatDateTime(note.created_at)}
          </time>
          <span className="note-head-sep" />
          <span>{chars.length} 字</span>
        </div>

        <p className="note-text">{open || !overflow ? note.content : collapsed}</p>

        {overflow && (
          <button
            type="button"
            className="note-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            {open ? "收起" : "展开全文"}
            <Icon name="chevron-down" size={13} className="note-toggle-icon" />
          </button>
        )}
      </div>
    </article>
  );
}