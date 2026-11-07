import { BackgroundsManager } from "@/components/admin/backgrounds-manager";
import { listBackgrounds } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "背景管理" };

export default async function AdminBackgroundsPage() {
  const backgrounds = await listBackgrounds();
  return <BackgroundsManager initial={backgrounds} />;
}