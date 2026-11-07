import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { PhotoGallery } from "@/components/photo-gallery";
import { listPhotos } from "@/lib/db";
import type { Photo } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "照片" };

function groupPhotos(photos: Photo[]) {
  const groups = new Map<string, Photo[]>();
  for (const photo of photos) {
    const album = photo.album?.trim() || "未分类";
    const list = groups.get(album) ?? [];
    list.push(photo);
    groups.set(album, list);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === "未分类") return 1;
    if (b === "未分类") return -1;
    return a.localeCompare(b, "zh-CN");
  });
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string }>;
}) {
  const { album: selectedAlbum } = await searchParams;
  const photos = await listPhotos();
  const allGroups = groupPhotos(photos);
  const groups = selectedAlbum
    ? allGroups.filter(([name]) => name === selectedAlbum)
    : allGroups;

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Gallery · 照片"
        title={selectedAlbum ? `相册「${selectedAlbum}」` : "随手拍下的光"}
        description="按相册收好每一组照片。点开照片进入沉浸查看：滚轮缩放、拖动平移，右上角退出。"
        right={
          <span className="chip">
            <Icon name="image" size={13} />
            {selectedAlbum ? `${groups[0]?.[1].length ?? 0} 张` : `${photos.length} 张`}
          </span>
        }
      />

      {photos.length > 0 ? (
        <>
          <div className="reveal mb-8 flex flex-wrap gap-2">
            <Link
              href="/photos"
              className="chip"
              style={
                !selectedAlbum
                  ? {
                      color: "var(--accent)",
                      borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                      background: "var(--accent-soft)",
                    }
                  : undefined
              }
            >
              全部相册
              <span className="opacity-50">{photos.length}</span>
            </Link>
            {allGroups.map(([name, items]) => (
              <Link
                key={name}
                href={`/photos?album=${encodeURIComponent(name)}`}
                className="chip"
                style={
                  selectedAlbum === name
                    ? {
                        color: "var(--accent)",
                        borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                        background: "var(--accent-soft)",
                      }
                    : undefined
                }
              >
                <Icon name="folder" size={12} />
                {name}
                <span className="opacity-50">{items.length}</span>
              </Link>
            ))}
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon="folder"
              title={`相册「${selectedAlbum}」还是空的`}
              description="这个相册里暂时没有照片，换个相册看看。"
              actionHref="/photos"
              actionLabel="查看全部照片"
            />
          ) : (
          <div className="space-y-12">
            {groups.map(([name, items], index) => (
              <section key={name} className="reveal" style={{ ["--i" as string]: index }}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon name="folder" size={16} />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em]">{name}</h2>
                    <p className="text-[0.7rem] text-muted">{items.length} 张照片</p>
                  </div>
                  <div className="divider flex-1" />
                </div>
                <PhotoGallery photos={items} />
              </section>
            ))}
          </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="image"
          title="照片墙还是空的"
          description="去后台上传第一张照片，让这里有点光。"
          actionHref="/admin"
          actionLabel="进入后台"
        />
      )}
    </div>
  );
}