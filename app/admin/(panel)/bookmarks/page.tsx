import { BookmarksManager } from "@/components/admin/bookmarks-manager";
import { listBookmarks } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "收藏管理" };

export default async function AdminBookmarksPage() {
  const bookmarks = await listBookmarks();
  return <BookmarksManager initial={bookmarks} />;
}