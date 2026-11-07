import { ProjectsManager } from "@/components/admin/projects-manager";
import { listProjects } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "项目管理" };

export default async function AdminProjectsPage() {
  const projects = await listProjects();
  return <ProjectsManager initial={projects} />;
}