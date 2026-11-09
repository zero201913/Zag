import { PhotosManager } from "@/components/admin/photos-manager";
import { listPhotoAlbumOrder, listPhotos } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "照片管理" };

export default async function AdminPhotosPage() {
  const [photos, albumOrder] = await Promise.all([listPhotos(), listPhotoAlbumOrder()]);
  return (
    <PhotosManager
      initial={photos}
      initialAlbumOrder={albumOrder.map((row) => row.name)}
    />
  );
}