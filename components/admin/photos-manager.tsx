"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AdminField, AdminPageHeader } from "./admin-page-header";
import { CategoryCombobox } from "./category-combobox";
import { Toast, useToast } from "./toast";
import { Icon } from "../icons";
import { compressImage, getImageDimensions, apiRequest, uploadFile } from "@/lib/admin-client";
import { UNCATEGORIZED, categoryOptions, normalizeCategory } from "@/lib/categories";
import {
  HOME_PHOTOS_LIMIT_MAX,
  HOME_PHOTOS_LIMIT_MIN,
  type HomePhotosConfig,
  type HomePhotosMode,
} from "@/lib/home-photos";
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

/** 按后台保存的顺序排序；未保存过的相册按名称排在后面，“不分类”始终最后。 */
function mergeAlbumOrder(options: string[], saved: string[]) {
  const rank = new Map(saved.map((name, index) => [name, index]));
  return [...options].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    const ra = rank.get(a);
    const rb = rank.get(b);
    if (ra !== undefined && rb !== undefined) return ra - rb;
    if (ra !== undefined) return -1;
    if (rb !== undefined) return 1;
    return a.localeCompare(b, "zh-CN");
  });
}

export function PhotosManager({
  initial,
  initialAlbumOrder,
  initialHomePhotos,
}: {
  initial: Photo[];
  initialAlbumOrder: string[];
  initialHomePhotos: HomePhotosConfig;
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [uploading, setUploading] = useState<Uploading | null>(null);
  const [uploadAlbum, setUploadAlbum] = useState(UNCATEGORIZED);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(UNCATEGORIZED);
  const [albumOrder, setAlbumOrder] = useState(initialAlbumOrder);
  const [showOrder, setShowOrder] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [homePhotos, setHomePhotos] = useState(initialHomePhotos);
  const [showHome, setShowHome] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast, show } = useToast();
  const albums = mergeAlbumOrder(
    categoryOptions(items.map((item) => item.album)),
    albumOrder,
  );
  const movableAlbums = albums.filter((album) => album !== UNCATEGORIZED);
  const visibleItems = selectedAlbum
    ? items.filter((item) => normalizeCategory(item.album) === selectedAlbum)
    : items;
  const selectedHomePhotos = homePhotos.ids
    .map((id) => items.find((item) => item.id === id))
    .filter((photo): photo is Photo => Boolean(photo));
  const pickerCandidates = items.filter((item) => !homePhotos.ids.includes(item.id));

  function countOf(album: string) {
    return items.filter((item) => normalizeCategory(item.album) === album).length;
  }

  function rememberAlbum(name: string) {
    setAlbumOrder((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev.filter((album) => album !== UNCATEGORIZED), name, UNCATEGORIZED];
    });
  }

  async function moveAlbum(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= movableAlbums.length) return;
    const nextMovable = [...movableAlbums];
    [nextMovable[index], nextMovable[target]] = [nextMovable[target], nextMovable[index]];
    const next = [...nextMovable, UNCATEGORIZED];
    const prev = albumOrder;

    setAlbumOrder(next);
    setSavingOrder(true);
    try {
      await apiRequest("/api/admin/photo-albums", {
        method: "PUT",
        body: JSON.stringify({ order: next }),
      });
      show("相册展示顺序已保存");
    } catch (error) {
      setAlbumOrder(prev);
      show((error as Error).message, "error");
    } finally {
      setSavingOrder(false);
    }
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
        rememberAlbum(album);
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

  async function handleToggleBlur(photo: Photo) {
    try {
      const data = await apiRequest<{ item: Photo }>(`/api/admin/photos/${photo.id}`, {
        method: "PUT",
        body: JSON.stringify({ blurred: photo.blurred === 1 ? 0 : 1 }),
      });
      setItems((list) => list.map((entry) => (entry.id === photo.id ? data.item : entry)));
      if (editing?.id === photo.id) setEditing(data.item);
      show(data.item.blurred === 1 ? "已开启缩略图模糊" : "已关闭缩略图模糊");
    } catch (error) {
      show((error as Error).message, "error");
    }
  }

  /** 首页展示配置的即时保存：先本地生效，失败再回滚 */
  async function saveHome(next: HomePhotosConfig, message: string) {
    const prev = homePhotos;
    setHomePhotos(next);
    setSavingHome(true);
    try {
      const data = await apiRequest<{ config: HomePhotosConfig }>("/api/admin/home-photos", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      setHomePhotos(data.config);
      show(message);
    } catch (error) {
      setHomePhotos(prev);
      show((error as Error).message, "error");
    } finally {
      setSavingHome(false);
    }
  }

  function homeIds() {
    return selectedHomePhotos.map((photo) => photo.id);
  }

  function changeHomeMode(mode: HomePhotosMode) {
    if (mode === homePhotos.mode) return;
    void saveHome(
      { ...homePhotos, mode },
      mode === "manual" ? "已切换为手动挑选" : "已切换为自动最新",
    );
  }

  function changeHomeLimit(delta: number) {
    const limit = Math.min(
      HOME_PHOTOS_LIMIT_MAX,
      Math.max(HOME_PHOTOS_LIMIT_MIN, homePhotos.limit + delta),
    );
    if (limit === homePhotos.limit) return;
    void saveHome({ ...homePhotos, limit }, `首页展示数量：${limit} 张`);
  }

  function fillLatestHome() {
    const ids = items.slice(0, homePhotos.limit).map((photo) => photo.id);
    void saveHome({ ...homePhotos, mode: "manual", ids }, `已填入最新 ${ids.length} 张`);
  }

  function addHomePhoto(id: string) {
    if (homePhotos.ids.includes(id) || selectedHomePhotos.length >= homePhotos.limit) return;
    void saveHome({ ...homePhotos, ids: [...homeIds(), id] }, "已加入首页展示");
  }

  function removeHomePhoto(id: string) {
    void saveHome(
      { ...homePhotos, ids: homeIds().filter((entry) => entry !== id) },
      "已从首页移除",
    );
  }

  function moveHomePhoto(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= selectedHomePhotos.length) return;
    const ids = homeIds();
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void saveHome({ ...homePhotos, ids }, "首页顺序已更新");
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
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              照片墙 · {items.length}
            </p>
            <div className="flex items-center gap-2">
              <span className="hidden text-[0.66rem] text-muted sm:inline">
                {selectedAlbum ? `${selectedAlbum} · ${visibleItems.length} 张` : "点击图片编辑"}
              </span>
              <button
                type="button"
                className={`chip !px-2.5 !py-1 !text-[0.66rem] ${showHome ? "chip-accent" : ""}`}
                onClick={() => setShowHome((value) => !value)}
                aria-expanded={showHome}
                aria-controls="home-photos-config"
              >
                <Icon name="home" size={11} />
                首页展示
                <span className="opacity-50">
                  {homePhotos.mode === "manual"
                    ? `${selectedHomePhotos.length} 张`
                    : `${homePhotos.limit} 张`}
                </span>
              </button>
              <button
                type="button"
                className={`chip !px-2.5 !py-1 !text-[0.66rem] ${showOrder ? "chip-accent" : ""}`}
                onClick={() => setShowOrder((value) => !value)}
                aria-expanded={showOrder}
                aria-controls="photo-album-order"
              >
                <Icon name="menu" size={11} />
                相册顺序
              </button>
            </div>
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

          {showHome && (
            <div
              id="home-photos-config"
              className="m-1 mb-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_45%,transparent)] p-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-1.5">
                <p className="text-[0.68rem] text-muted">
                  首页「最近的照片」展示哪些照片、几张、什么顺序。
                </p>
                <span className="text-[0.62rem] text-muted">
                  {savingHome
                    ? "保存中…"
                    : homePhotos.mode === "manual"
                      ? `已选 ${selectedHomePhotos.length} / 上限 ${homePhotos.limit}`
                      : `自动取最新 ${homePhotos.limit} 张`}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className={`chip !px-2.5 !py-1 !text-[0.66rem] ${homePhotos.mode === "auto" ? "chip-accent" : ""}`}
                    onClick={() => changeHomeMode("auto")}
                    aria-pressed={homePhotos.mode === "auto"}
                    disabled={savingHome}
                  >
                    <Icon name="refresh" size={11} />
                    自动最新
                  </button>
                  <button
                    type="button"
                    className={`chip !px-2.5 !py-1 !text-[0.66rem] ${homePhotos.mode === "manual" ? "chip-accent" : ""}`}
                    onClick={() => changeHomeMode("manual")}
                    aria-pressed={homePhotos.mode === "manual"}
                    disabled={savingHome}
                  >
                    <Icon name="grid" size={11} />
                    手动挑选
                  </button>
                </div>

                <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />

                <div className="flex items-center gap-1">
                  <span className="text-[0.66rem] text-muted">数量</span>
                  <button
                    type="button"
                    className="icon-btn !h-6 !w-6"
                    disabled={homePhotos.limit <= HOME_PHOTOS_LIMIT_MIN || savingHome}
                    onClick={() => changeHomeLimit(-1)}
                    aria-label="减少首页展示数量"
                  >
                    <Icon name="chevron-down" size={11} />
                  </button>
                  <span className="w-5 text-center font-mono text-xs">{homePhotos.limit}</span>
                  <button
                    type="button"
                    className="icon-btn !h-6 !w-6"
                    disabled={homePhotos.limit >= HOME_PHOTOS_LIMIT_MAX || savingHome}
                    onClick={() => changeHomeLimit(1)}
                    aria-label="增加首页展示数量"
                  >
                    <Icon name="chevron-up" size={11} />
                  </button>
                  <span className="text-[0.6rem] text-muted">张</span>
                </div>

                {homePhotos.mode === "manual" && (
                  <button
                    type="button"
                    className="chip !px-2.5 !py-1 !text-[0.66rem]"
                    onClick={fillLatestHome}
                    disabled={savingHome || items.length === 0}
                  >
                    <Icon name="sparkles" size={11} />
                    用最新 {homePhotos.limit} 张
                  </button>
                )}
              </div>

              {homePhotos.mode === "manual" ? (
                <>
                  {selectedHomePhotos.length === 0 ? (
                    <p className="mt-2 px-2 py-2 text-[0.68rem] text-muted">
                      还没有挑选照片，首页会先回退到自动展示最新 {homePhotos.limit} 张。
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {selectedHomePhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="flex items-center gap-2 rounded-lg bg-[var(--glass-soft)] px-2 py-1.5"
                        >
                          <span className="w-4 shrink-0 text-center font-mono text-[0.6rem] text-muted">
                            {index + 1}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrl(photo.r2_key)}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-md object-cover"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {photo.title || "未命名"}
                          </span>
                          <button
                            type="button"
                            className="icon-btn !h-6 !w-6"
                            disabled={index === 0 || savingHome}
                            onClick={() => moveHomePhoto(index, -1)}
                            aria-label={`${photo.title || "照片"} 上移`}
                          >
                            <Icon name="chevron-up" size={12} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn !h-6 !w-6"
                            disabled={
                              index === selectedHomePhotos.length - 1 || savingHome
                            }
                            onClick={() => moveHomePhoto(index, 1)}
                            aria-label={`${photo.title || "照片"} 下移`}
                          >
                            <Icon name="chevron-down" size={12} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn !h-6 !w-6"
                            disabled={savingHome}
                            onClick={() => removeHomePhoto(photo.id)}
                            aria-label={`${photo.title || "照片"} 从首页移除`}
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                    <button
                      type="button"
                      className="chip !px-2.5 !py-1 !text-[0.66rem]"
                      onClick={() => setShowPicker((value) => !value)}
                      aria-expanded={showPicker}
                      aria-controls="home-photo-picker"
                      disabled={pickerCandidates.length === 0}
                    >
                      <Icon name="plus" size={11} />
                      从照片墙添加
                      <span className="opacity-50">{pickerCandidates.length}</span>
                    </button>
                    <span className="text-[0.6rem] text-muted">
                      {selectedHomePhotos.length >= homePhotos.limit
                        ? `已达上限 ${homePhotos.limit} 张`
                        : "点击缩略图即可加入"}
                    </span>
                  </div>

                  {showPicker && pickerCandidates.length > 0 && (
                    <div
                      id="home-photo-picker"
                      className="mt-2 grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2 sm:grid-cols-8"
                    >
                      {pickerCandidates.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          className="group relative aspect-square overflow-hidden rounded-lg border border-transparent transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => addHomePhoto(photo.id)}
                          disabled={
                            savingHome || selectedHomePhotos.length >= homePhotos.limit
                          }
                          title={photo.title || "未命名"}
                          aria-label={`把 ${photo.title || "照片"} 加到首页`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrl(photo.r2_key)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[0.52rem] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {photo.title || "未命名"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-2 px-2 pb-1 text-[0.66rem] text-muted">
                  按拍摄时间从新到旧自动取前 {homePhotos.limit} 张。想固定某几张，就切到「手动挑选」。
                </p>
              )}
            </div>
          )}

          {showOrder && (
            <div
              id="photo-album-order"
              className="m-1 mb-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_45%,transparent)] p-2"
            >
              <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
                <p className="text-[0.68rem] text-muted">调整后立即同步到「照片」页的相册顺序</p>
                <span className="text-[0.62rem] text-muted">{savingOrder ? "保存中…" : "上 / 下移动"}</span>
              </div>

              {movableAlbums.length === 0 ? (
                <p className="px-2 py-3 text-center text-[0.7rem] text-muted">
                  还没有可排序的相册，先上传照片或新建分类。
                </p>
              ) : (
                <div className="space-y-1">
                  {movableAlbums.map((album, index) => (
                    <div
                      key={album}
                      className="flex items-center gap-2 rounded-lg bg-[var(--glass-soft)] px-2 py-1.5"
                    >
                      <span className="w-4 shrink-0 text-center font-mono text-[0.6rem] text-muted">
                        {index + 1}
                      </span>
                      <Icon name="folder" size={12} className="shrink-0 text-[var(--accent)]" />
                      <span className="min-w-0 flex-1 truncate text-xs">{album}</span>
                      <span className="shrink-0 text-[0.62rem] text-muted">{countOf(album)} 张</span>
                      <button
                        type="button"
                        className="icon-btn !h-6 !w-6"
                        disabled={index === 0 || savingOrder}
                        onClick={() => void moveAlbum(index, -1)}
                        aria-label={`${album} 上移`}
                      >
                        <Icon name="chevron-up" size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn !h-6 !w-6"
                        disabled={index === movableAlbums.length - 1 || savingOrder}
                        onClick={() => void moveAlbum(index, 1)}
                        aria-label={`${album} 下移`}
                      >
                        <Icon name="chevron-down" size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-2 py-1.5 opacity-55">
                    <span className="w-4 shrink-0 text-center font-mono text-[0.6rem]">—</span>
                    <Icon name="folder" size={12} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-xs">{UNCATEGORIZED}</span>
                    <span className="shrink-0 text-[0.62rem]">
                      {countOf(UNCATEGORIZED)} 张 · 始终最后
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  } ${photo.blurred === 1 ? "thumb-mask" : ""}`}
                  onClick={() => setEditing(photo)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(photo.r2_key)}
                    alt={photo.title || "照片"}
                    loading="lazy"
                    className={`h-full w-full object-cover ${
                      photo.blurred === 1
                        ? ""
                        : "transition-transform duration-500 group-hover:scale-105"
                    }`}
                  />
                  <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-4.5rem)] truncate rounded-md bg-black/50 px-1.5 py-0.5 text-[0.58rem] font-medium text-white backdrop-blur">
                    {normalizeCategory(photo.album)}
                  </span>
                  {photo.blurred === 1 && (
                    <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.56rem] font-medium text-white backdrop-blur">
                      <Icon name="eye-off" size={9} />
                      已模糊
                    </span>
                  )}
                  {homePhotos.mode === "manual" &&
                    selectedHomePhotos.indexOf(photo) >= 0 && (
                      <span
                        className="absolute bottom-1.5 right-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[0.56rem] font-semibold text-white"
                        title="正在首页展示"
                      >
                        <Icon name="home" size={9} />
                        {selectedHomePhotos.indexOf(photo) + 1}
                      </span>
                    )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-7 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-[0.66rem] font-medium text-white">
                      {photo.title || "未命名"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="absolute right-10 top-1.5 rounded-lg bg-black/50 p-1.5 text-white opacity-100 backdrop-blur transition-opacity hover:bg-[var(--accent)] sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleBlur(photo);
                    }}
                    aria-label={photo.blurred === 1 ? "关闭缩略图模糊" : "开启缩略图模糊"}
                    aria-pressed={photo.blurred === 1}
                    title={photo.blurred === 1 ? "关闭缩略图模糊" : "开启缩略图模糊"}
                  >
                    <Icon name={photo.blurred === 1 ? "eye" : "eye-off"} size={12} />
                  </button>
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
                rememberAlbum(normalizeCategory(item.album));
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
          blurred: form.blurred,
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

      <div
        className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] ${
          form.blurred === 1 ? "thumb-mask" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(form.r2_key)}
          alt={form.title || "照片"}
          className="max-h-[300px] w-full object-contain"
        />
        {form.blurred === 1 && (
          <span className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-white">
            <Icon name="eye-off" size={18} className="drop-shadow" />
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[0.6rem] font-medium backdrop-blur">
              已开启缩略图模糊 · 访客看到的效果
            </span>
          </span>
        )}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass-soft)] px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.blurred === 1}
            onChange={(event) => update("blurred", event.target.checked ? 1 : 0)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">缩略图模糊遮罩</span>
            <span className="mt-0.5 block text-[0.68rem] leading-relaxed text-muted">
              首页和照片墙里的缩略图会默认打码，适合非工作安全（NSFW）的照片。
              访客点开后还要再确认一次才会看到原图。
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}