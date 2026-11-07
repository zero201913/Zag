import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { MusicPlayer } from "@/components/music-player";
import { PageHeading } from "@/components/page-heading";
import { listTracks } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "音乐" };

export default async function MusicPage() {
  const tracks = await listTracks();

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Music · 音乐"
        title="写作时循环的声音"
        description="存在 R2 里的播放列表，带进度条和音量。戴上耳机，慢慢听。"
        right={
          <span className="chip">
            <Icon name="music" size={13} />
            {tracks.length} 首
          </span>
        }
      />

      {tracks.length > 0 ? (
        <MusicPlayer tracks={tracks} />
      ) : (
        <EmptyState
          icon="music"
          title="播放列表还是空的"
          description="去后台上传第一首歌，支持 MP3、WAV、M4A、OGG、FLAC。"
          actionHref="/admin/music"
          actionLabel="去上传音乐"
        />
      )}

      {tracks.length > 0 && (
        <div className="glass-soft mt-5 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 text-xs text-muted">
          <Icon name="cloud" size={15} className="text-[var(--accent)]" />
          <span>音频存放在 Cloudflare R2，通过支持 Range 的流式接口播放，可拖动进度。</span>
        </div>
      )}
    </div>
  );
}