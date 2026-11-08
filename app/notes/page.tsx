import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icons";
import { NoteTimeline } from "@/components/note-timeline";
import { PageHeading } from "@/components/page-heading";
import { listNotes } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "说说" };

export default async function NotesPage() {
  const notes = await listNotes({ limit: 200 });

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Notes · 说说"
        title="短句与碎片"
        description="没有标题，也没有摘要。只是把此刻想说的话，放进一张纸页里。"
        right={
          <span className="chip">
            <Icon name="message" size={13} />
            {notes.length} 条
          </span>
        }
      />

      {notes.length > 0 ? (
        <NoteTimeline notes={notes} />
      ) : (
        <EmptyState
          icon="message"
          title="还没有说说"
          description="去后台写一条吧，短一点也没关系。"
          actionHref="/admin/notes"
          actionLabel="去后台写说说"
        />
      )}
    </div>
  );
}