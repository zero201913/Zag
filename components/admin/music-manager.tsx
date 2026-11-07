"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { apiRequest, compressImage, getAudioDuration, uploadFile } from "@/lib/admin-client";
import { extractAudioTags, extractAudioTagsFromUrl } from "@/lib/audio-metadata";
import type { Track } from "@/lib/types";
import { formatDuration, formatShortDate, mediaUrl } from "@/lib/utils";

function blankTrack(): Track {
  return {
    id: "",
    title: "",
    artist: "",
    album: "",
    r2_key: "",
    cover_key: null,
    duration: null,
    sort_order: 0,
    created_at: 0,
  };
}

interface Progress {
  stage: string;
  percent: number;
}

export function MusicManager({ initial }: { initial: Track[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Track | null>(initial[0] ?? blankTrack());
  const { toast, show } = useToast();
  const albums = Array.from(
    new Set(items.map((item) => item.album.trim()).filter(Boolean)),
  );

  function handleSaved(item: Track) {
    setItems((list) => {
      const exists = list.some((entry) => entry.id === item.id);
      const next = exists
        ? list.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...list];
      return next.sort((a, b) => a.sort_order - b.sort_order);
    });
    setEditing(item);
    show("音乐已保存");
  }

  async function handleDelete(track: Track) {
    if (!window.confirm(`确定删除「${track.title}」吗？R2 里的音频和封面也会被删除。`)) return;
    try {
      await apiRequest(`/api/admin/tracks/${track.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== track.id));
      if (editing?.id === track.id) setEditing(null);
      show("音乐已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="音乐"
        description="音频上传到 R2，自动读取 MP3 内嵌封面与 ID3 信息，前台支持全局播放。"
        action={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(blankTrack())}>
            <Icon name="plus" size={15} />
            添加音乐
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="glass rounded-[24px] p-3">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            播放列表 · {items.length}
          </p>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {items.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted">
                还没有音乐，点右上角添加。
              </p>
            )}
            {items.map((track, index) => (
              <div
                key={track.id}
                className={`group flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                  editing?.id === track.id
                    ? "border-[color-mix(in_srgb,var(--accent)_26%,transparent)] bg-[var(--accent-soft)]"
                    : "border-transparent hover:bg-[var(--glass-soft)]"
                }`}
                onClick={() => setEditing(track)}
              >
                <span className="w-5 shrink-0 text-center font-mono text-[0.66rem] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--glass-soft)] text-[var(--accent)]">
                  {track.cover_key ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(track.cover_key)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="music" size={15} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{track.title}</span>
                  <span className="block truncate text-[0.66rem] text-muted">
                    {track.artist || "未知艺术家"}
                    {track.album ? ` · ${track.album}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[0.64rem] text-muted">
                  {formatDuration(track.duration)}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(track);
                  }}
                  aria-label={`删除 ${track.title}`}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-editor">
          {editing ? (
            <TrackEditor
              key={editing.id || "new"}
              track={editing}
              albums={albums}
              onSaved={handleSaved}
              onCancel={() => setEditing(null)}
              onError={(message) => show(message, "error")}
            />
          ) : (
            <div className="glass flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
              <Icon name="music" size={32} className="text-[var(--accent)]" />
              <p className="mt-3 text-sm text-muted">选择一首歌，或添加新的音乐。</p>
              <button type="button" className="btn btn-primary mt-4" onClick={() => setEditing(blankTrack())}>
                <Icon name="plus" size={15} />
                添加音乐
              </button>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function TrackEditor({
  track,
  albums,
  onSaved,
  onCancel,
  onError,
}: {
  track: Track;
  albums: string[];
  onSaved: (item: Track) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(track);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverSource, setCoverSource] = useState("");
  const [duration, setDuration] = useState<number | null>(track.duration);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const audioInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function update<K extends keyof Track>(key: K, value: Track[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAudioChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAudioFile(file);
    const [detected, tags] = await Promise.all([
      getAudioDuration(file),
      extractAudioTags(file),
    ]);
    if (detected) setDuration(detected);
    setForm((current) => ({
      ...current,
      title: current.title || tags.title || file.name.replace(/\.[^.]+$/, ""),
      artist: current.artist || tags.artist || "",
      album: current.album || tags.album || "",
    }));

    if (tags.picture && !form.cover_key && !coverFile) {
      const prepared = await compressImage(tags.picture, 1400);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(prepared);
      setCoverPreview(URL.createObjectURL(prepared));
      setCoverSource("已自动读取 MP3 内嵌封面");
    }
  }

  async function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const prepared = await compressImage(file, 1400);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(prepared);
    setCoverPreview(URL.createObjectURL(prepared));
    setCoverSource("已手动选择封面");
  }

  async function extractExistingCover() {
    if (!form.r2_key || extracting) return;
    setExtracting(true);
    try {
      const tags = await extractAudioTagsFromUrl(mediaUrl(form.r2_key));
      if (!tags.picture) {
        onError("这个音频文件没有内嵌封面，请手动选择一张图片。");
        return;
      }
      const prepared = await compressImage(tags.picture, 1400);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(prepared);
      setCoverPreview(URL.createObjectURL(prepared));
      setCoverSource("已从音频文件读取内嵌封面");
    } catch {
      onError("读取音频封面失败，请手动选择一张图片。");
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    if (!form.title.trim()) {
      onError("请填写歌曲名称");
      return;
    }
    if (!track.id && !audioFile) {
      onError("新歌曲需要选择一个音频文件");
      return;
    }

    setSaving(true);
    try {
      let r2Key = form.r2_key;
      if (audioFile) {
        setProgress({ stage: "上传音频", percent: 0 });
        const uploaded = await uploadFile(audioFile, "audio", (percent) =>
          setProgress({ stage: "上传音频", percent }),
        );
        r2Key = uploaded.key;
      }

      let coverKey = form.cover_key;
      if (coverFile) {
        setProgress({ stage: "上传封面", percent: 0 });
        const uploaded = await uploadFile(coverFile, "cover", (percent) =>
          setProgress({ stage: "上传封面", percent }),
        );
        coverKey = uploaded.key;
      }

      const payload = {
        title: form.title,
        artist: form.artist,
        album: form.album,
        r2_key: r2Key,
        cover_key: coverKey,
        duration,
        sort_order: form.sort_order,
      };

      const data = track.id
        ? await apiRequest<{ item: Track }>(`/api/admin/tracks/${track.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ item: Track }>("/api/admin/tracks", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setForm(data.item);
      setAudioFile(null);
      setCoverFile(null);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
      onSaved(data.item);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const coverSrc = coverPreview || (form.cover_key ? mediaUrl(form.cover_key) : "");

  return (
    <div className="glass rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{track.id ? "编辑音乐" : "添加音乐"}</h2>
          <p className="text-[0.68rem] text-muted">
            {track.id ? `添加于 ${formatShortDate(track.created_at)}` : "选择音频后会自动读取时长"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost !px-3" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Icon name="loader" size={15} className="animate-spin" /> : <Icon name="check" size={15} />}
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      {progress && (
        <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--glass-soft)] p-3">
          <div className="flex items-center justify-between text-xs">
            <span>{progress.stage}…</span>
            <span className="font-mono text-[var(--accent)]">{progress.percent}%</span>
          </div>
          <div className="progress mt-2">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-3.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="歌曲名称">
            <input
              className="field !font-semibold"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="歌曲名"
            />
          </AdminField>
          <AdminField label="艺术家">
            <input
              className="field"
              value={form.artist}
              onChange={(event) => update("artist", event.target.value)}
              placeholder="歌手 / 乐队"
            />
          </AdminField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="专辑 / 音乐包" hint="相同专辑会归到同一组">
            <input
              className="field"
              value={form.album}
              onChange={(event) => update("album", event.target.value)}
              placeholder="专辑名（可选）"
              list="music-albums"
            />
          </AdminField>
          <AdminField label="排序" hint="数字越小越靠前">
            <input
              type="number"
              className="field"
              value={form.sort_order}
              onChange={(event) => update("sort_order", Number(event.target.value))}
            />
          </AdminField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-soft)] p-4">
            <p className="label">音频文件</p>
            <p className="truncate text-xs text-muted">
              {audioFile
                ? audioFile.name
                : form.r2_key
                  ? "已上传 · 可替换"
                  : "尚未选择文件"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={audioInput}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioChange}
              />
              <button type="button" className="btn !px-3 !py-1.5 !text-xs" onClick={() => audioInput.current?.click()}>
                <Icon name="upload" size={13} />
                {form.r2_key || audioFile ? "替换音频" : "选择音频"}
              </button>
              <span className="font-mono text-[0.66rem] text-muted">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--glass-soft)] p-4">
            <p className="label">封面（可选，MP3 可自动读取）</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)]">
                {coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="image" size={17} />
                )}
              </span>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
              <button type="button" className="btn !px-3 !py-1.5 !text-xs" onClick={() => coverInput.current?.click()}>
                <Icon name="upload" size={13} />
                {form.cover_key || coverFile ? "替换封面" : "选择封面"}
              </button>
              {form.r2_key && (
                <button
                  type="button"
                  className="btn !px-3 !py-1.5 !text-xs"
                  onClick={() => void extractExistingCover()}
                  disabled={extracting}
                >
                  <Icon name={extracting ? "loader" : "image"} size={13} className={extracting ? "animate-spin" : ""} />
                  {extracting ? "读取中…" : "从音频取封面"}
                </button>
              )}
            </div>
            {coverSource && (
              <p className="mt-2 text-[0.66rem] text-[var(--accent)]">{coverSource}</p>
            )}
          </div>
        </div>

        <p className="rounded-xl border border-[var(--border)] bg-[var(--glass-soft)] px-3 py-2 text-[0.68rem] text-muted">
          支持 MP3 / WAV / M4A / OGG / FLAC 等格式，最大 60MB。选择音频后会自动读取 ID3
          标题 / 艺术家 / 专辑；带内嵌封面的 MP3 无需再手动上传封面。
        </p>
        <datalist id="music-albums">
          {albums.map((album) => (
            <option key={album} value={album} />
          ))}
        </datalist>
      </div>
    </div>
  );
}