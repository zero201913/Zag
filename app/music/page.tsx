import { Icon } from "@/components/icons";
import { MusicLibrary } from "@/components/music-library";
import { PageHeading } from "@/components/page-heading";
import { listTracks } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "音乐" };

export default async function MusicPage() {
  const tracks = await listTracks();

  return (
    <div className="page-wrap pb-28">
      <PageHeading
        eyebrow="Music · 音乐"
        title="写作时循环的声音"
        description="按专辑分成不同音乐包。点开一张专辑就开始播放，切换到全站任何页面都不会中断。"
        right={
          <span className="chip">
            <Icon name="music" size={13} />
            {tracks.length} 首
          </span>
        }
      />

      <MusicLibrary initialTracks={tracks} />
    </div>
  );
}