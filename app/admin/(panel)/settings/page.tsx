import { SettingsManager } from "@/components/admin/settings-manager";
import { getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "站点设置" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return <SettingsManager initial={settings} />;
}