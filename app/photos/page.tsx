import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { PhotoGallery } from "@/components/photo-gallery";
import { listPhotos } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "照片" };

export default async function PhotosPage() {
  const photos = await listPhotos();

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Gallery · 照片"
        title="随手拍下的光"
        description="没有主题，也不一定有故事。只是某些瞬间，值得留下来。"
        right={
          <span className="chip">
            <Icon name="image" size={13} />
            {photos.length} 张
          </span>
        }
      />

      {photos.length > 0 ? (
        <PhotoGallery photos={photos} />
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