import { MusicManager } from "@/components/admin/music-manager";
import { listTracks } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "音乐管理" };

export default async function AdminMusicPage() {
  const tracks = await listTracks();
  return <MusicManager initial={tracks} />;
}