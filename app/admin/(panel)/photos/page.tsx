import { PhotosManager } from "@/components/admin/photos-manager";
import { listPhotos } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "照片管理" };

export default async function AdminPhotosPage() {
  const photos = await listPhotos();
  return <PhotosManager initial={photos} />;
}