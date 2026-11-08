import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { listProjects } from "@/lib/db";
import { formatDate, parseTags } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "项目" };

const ICONS: IconName[] = ["sparkles", "database", "cloud", "code", "folder", "grid"];

function iconOf(value: string): IconName {
  return ICONS.includes(value as IconName) ? (value as IconName) : "sparkles";
}

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Projects · 项目"
        title="正在做，和做过的东西"
        description="一些自己会用的工具、网站和实验。点开看看，或者去仓库翻代码。"
        right={
          <span className="chip">
            <Icon name="folder" size={13} />
            {projects.length} 个项目
          </span>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title="还没有项目"
          description="去后台添加第一个项目链接吧。"
          actionHref="/admin"
          actionLabel="进入后台"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project, index) => {
            const tags = parseTags(project.tags);
            const external = /^https?:\/\//i.test(project.url);
            return (
              <div
                key={project.id}
                id={`project-${project.id}`}
                className="glass card card-hover reveal relative flex flex-col"
                style={{ ["--i" as string]: index }}
              >
                {/* 主链接铺满整张卡片；源码链接单独叠在上层，避免嵌套 <a> */}
                {external ? (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-0 rounded-[inherit]"
                    aria-label={`访问 ${project.name}`}
                  />
                ) : (
                  <Link
                    href={project.url || "/"}
                    className="absolute inset-0 z-0 rounded-[inherit]"
                    aria-label={`查看 ${project.name}`}
                  />
                )}

                <div className="pointer-events-none relative z-10 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon name={iconOf(project.icon)} size={22} />
                    </span>
                    <span className="chip">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-[-0.02em]">{project.name}</h2>
                      {external ? (
                        <Icon name="arrow-up-right" size={15} className="text-muted" />
                      ) : (
                        <Icon name="arrow-right" size={15} className="text-muted" />
                      )}
                    </div>
                    <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">
                      {project.description}
                    </p>
                    {tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span key={tag} className="chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                      {external ? "访问项目" : "站内查看"}
                      <Icon name={external ? "external" : "arrow-right"} size={13} />
                    </span>
                    {project.repo_url && (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto relative z-20 inline-flex items-center gap-1.5 text-muted transition-colors hover:text-[var(--accent)]"
                        aria-label={`查看 ${project.name} 的源码`}
                      >
                        <Icon name="github" size={13} />
                        源码
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}