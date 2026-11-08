import { NotesManager } from "@/components/admin/notes-manager";
import { listNotes } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "说说管理" };

export default async function AdminNotesPage() {
  const notes = await listNotes({ limit: 500 });
  return <NotesManager initial={notes} />;
}