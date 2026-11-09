"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { CategoryCombobox } from "./category-combobox";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { compressImage, getImageDimensions, apiRequest, uploadFile } from "@/lib/admin-client";
import { UNCATEGORIZED, categoryOptions, normalizeCategory } from "@/lib/categories";
import type { Photo } from "@/lib/types";
import { formatShortDate, mediaUrl } from "@/lib/utils";

interface Uploading {
  name: string;
  percent: number;
  index: number;
  total: number;
}

function toDateInput(unix: number | null) {
  if (!unix) return "";
  const date = new Date(unix * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function PhotosManager({ initial }: { initial: Photo[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState<Uploading | null>(null);
  const [uploadAlbum, setUploadAlbum] = useState(UNCATEGORIZED);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(UNCATEGORIZED);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast, show } = useToast();
  const albums = categoryOptions(items.map((item) => item.album));
  const visibleItems = selectedAlbum
    ? items.filter((item) => normalizeCategory(item.album) === selectedAlbum)
    : items;

  function countOf(album: string) {
    return items.filter((item) => normalizeCategory(item.album) === album).length;
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const album = normalizeCategory(uploadAlbum);
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setUploading({ name: file.name, percent: 0, index: index + 1, total: files.length });
      try {
        const prepared = await compressImage(file, 2400);
        const dimensions = await getImageDimensions(prepared);
        const uploaded = await uploadFile(prepared, "photo", (percent) =>
          setUploading({ name: file.name, percent, index: index + 1, total: files.length }),
        );
        const data = await apiRequest<{ item: Photo }>("/api/admin/photos", {
          method: "POST",
          body: JSON.stringify({
            title: file.name.replace(/\.[^.]+$/, ""),
            description: "",
            album,
            r2_key: uploaded.key,
            width: dimensions.width,
            height: dimensions.height,
          }),
        });
        setItems((list) => [data.item, ...list]);
        setSelectedAlbum(album);
        setEditing(data.item);
      } catch (error) {
        show(`${file.name}：${(error as Error).message}`, "error");
      }
    }

    setUploading(null);
    show(`已上传 ${files.length} 张照片`);
  }

  async function handleDelete(photo: Photo) {
    if (!window.confirm("确定删除这张照片吗？R2 里的原文件也会被删除。")) return;
    try {
      await apiRequest(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
      setItems((list) => list.filter((entry) => entry.id !== photo.id));
      if (editing?.id === photo.id) setEditing(null);
      show("照片已删除");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  return (
    <div className="pb-10">
      <AdminPageHeader
        title="照片"
        description="上传到 R2，元信息存进 D1。支持一次选择多张，并按相册分类查看。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <CategoryCombobox
              value={uploadAlbum}
              options={albums}
              onChange={setUploadAlbum}
              placeholder="相册（默认不分类）"
              ariaLabel="上传到相册"
              className="w-40"
              inputClassName="field !py-2 !text-xs"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading !== null}
            >
              <Icon name={uploading ? "loader" : "upload"} size={15} className={uploading ? "animate-spin" : ""} />
              {uploading ? "上传中…" : "上传照片"}
            </button>
          </div>
        }
      />

      {uploading && (
        <div className="glass-strong mb-4 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium">
              上传中（{uploading.index}/{uploading.total}）· {uploading.name}
            </span>
            <span className="font-mono text-[var(--accent)]">{uploading.percent}%</span>
          </div>
          <div className="progress mt-2">
            <span style={{ width: `${uploading.percent}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="glass rounded-[24px] p-3">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              照片墙 · {items.length}
            </p>
            <span className="text-[0.66rem] text-muted">
              {selectedAlbum ? `${selectedAlbum} · ${visibleItems.length} 张` : "点击图片编辑"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
            <button
              type="button"
              className={`chip ${selectedAlbum === null ? "chip-accent" : ""}`}
              onClick={() => setSelectedAlbum(null)}
            >
              全部
              <span className="opacity-50">{items.length}</span>
            </button>
            {albums.map((album) => (
              <button
                key={album}
                type="button"
                className={`chip ${selectedAlbum === album ? "chip-accent" : ""}`}
                onClick={() => setSelectedAlbum(album)}
              >
                <Icon name="folder" size={11} />
                {album}
                <span className="opacity-50">{countOf(album)}</span>
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <button
              type="button"
              className="m-1 flex w-[calc(100%-0.5rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              onClick={() => inputRef.current?.click()}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon name="image" size={22} />
              </span>
              <span className="mt-3 text-sm font-medium">点击上传第一张照片</span>
              <span className="mt-1 text-xs text-muted">JPG / PNG / WebP / GIF / AVIF，最大 25MB</span>
            </button>
          ) : visibleItems.length === 0 ? (
            <div className="m-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
              <Icon name="folder" size={26} className="text-[var(--accent)]" />
              <p className="mt-3 text-sm font-medium">「{selectedAlbum}」下还没有照片</p>
              <p className="mt-1 text-xs text-muted">切换分类，或上传一张新的照片。</p>
              <button type="button" className="btn btn-ghost mt-3 !px-3 !py-1.5 !text-xs" onClick={() => setSelectedAlbum(null)}>
                查看全部照片
              </button>
            </div>
          ) : (
            <div className="grid max-h-[64vh] grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3 2xl:grid-cols-4">
              {visibleItems.map((photo) => (
                <div
                  key={photo.id}
                  className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-all ${
                    editing?.id === photo.id
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                      : "border-[var(--border)]"
                  }`}
                  onClick={() => setEditing(photo)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(photo.r2_key)}
                    alt={photo.title || "照片"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-3rem)] truncate rounded-md bg-black/50 px-1.5 py-0.5 text-[0.58rem] font-medium text-white backdrop-blur">
                    {normalizeCategory(photo.album)}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-[0.66rem] font-medium text-white">
                      {photo.title || "未命名"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 rounded-lg bg-black/50 p-1.5 text-white opacity-100 backdrop-blur transition-opacity hover:bg-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(photo);
                    }}
                    aria-label="删除照片"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-editor">
          {editing ? (
            <PhotoEditor
              key={editing.id}
              photo={editing}
              albums={albums}
              onSaved={(item) => {
                setItems((list) => list.map((entry) => (entry.id === item.id ? item : entry)));
                setEditing(item);
                setSelectedAlbum(normalizeCategory(item.album));
                show("照片信息已保存");
              }}
              onCancel={() => setEditing(null)}
              onError={(message) => show(message, "error")}
            />
          ) : (
            <div className="glass flex min-h-[320px] flex-col items-center justify-center rounded-[24px] p-8 text-center">
              <Icon name="image" size={32} className="text-[var(--accent)]" />
              <p className="mt-3 text-sm text-muted">选择一张照片，编辑标题、相册和说明。</p>
              <p className="mt-1 text-[0.7rem] text-muted">上传后的文件会保存在 R2。</p>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

function PhotoEditor({
  photo,
  albums,
  onSaved,
  onCancel,
  onError,
}: {
  photo: Photo;
  albums: string[];
  onSaved: (item: Photo) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(photo);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Photo>(key: K, value: Photo[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const data = await apiRequest<{ item: Photo }>(`/api/admin/photos/${photo.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          album: normalizeCategory(form.album),
          taken_at: form.taken_at,
          r2_key: form.r2_key,
        }),
      });
      onSaved(data.item);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">编辑照片</h2>
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

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(form.r2_key)}
          alt={form.title || "照片"}
          className="max-h-[300px] w-full object-contain"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[0.66rem] text-muted">
        <span>{formatShortDate(form.created_at)}</span>
        <span>
          {form.width && form.height ? `${form.width} × ${form.height}` : "尺寸未知"}
        </span>
      </div>

      <div className="mt-4 space-y-3.5">
        <AdminField label="标题">
          <input
            className="field"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="给照片起个名字"
          />
        </AdminField>

        <AdminField label="相册分类" hint="相同相册名称会归到同一组，默认不分类">
          <CategoryCombobox
            value={normalizeCategory(form.album)}
            options={albums}
            onChange={(value) => update("album", value)}
            placeholder="输入或选择相册"
            ariaLabel="照片相册分类"
          />
        </AdminField>

        <AdminField label="说明">
          <textarea
            className="field min-h-[90px]"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="拍摄地点、当时的光线，或者什么都不写"
          />
        </AdminField>

        <AdminField label="拍摄日期">
          <input
            type="date"
            className="field"
            value={toDateInput(form.taken_at)}
            onChange={(event) =>
              update(
                "taken_at",
                event.target.value
                  ? Math.floor(new Date(`${event.target.value}T12:00:00`).getTime() / 1000)
                  : null,
              )
            }
          />
        </AdminField>
      </div>
    </div>
  );
}