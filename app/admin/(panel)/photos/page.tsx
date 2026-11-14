import { PhotosManager } from "@/components/admin/photos-manager";
import { getSetting, listPhotoAlbumOrder, listPhotos } from "@/lib/db";
import { parseHomePhotos } from "@/lib/home-photos";

export const dynamic = "force-dynamic";
export const metadata = { title: "照片管理" };

export default async function AdminPhotosPage() {
  const [photos, albumOrder, homePhotos] = await Promise.all([
    listPhotos(),
    listPhotoAlbumOrder(),
    getSetting("home_photos"),
  ]);
  return (
    <PhotosManager
      initial={photos}
      initialAlbumOrder={albumOrder.map((row) => row.name)}
      initialHomePhotos={parseHomePhotos(homePhotos)}
    />
  );
}