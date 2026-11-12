import { FilesManager } from "@/components/admin/files-manager";
import { listFiles } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "文件管理" };

export default async function AdminFilesPage() {
  const files = await listFiles();
  return <FilesManager initial={files} />;
}