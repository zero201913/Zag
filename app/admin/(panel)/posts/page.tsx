import { PostsManager } from "@/components/admin/posts-manager";
import { listAdminPostsPage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "文章管理" };

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q } = await searchParams;
  const data = await listAdminPostsPage({
    page: Number(page ?? "1") || 1,
    query: q ?? "",
  });
  return (
    <PostsManager
      initial={data.items}
      initialPage={data.page}
      initialTotal={data.total}
      initialTotalPages={data.totalPages}
      initialQuery={data.query}
      pageSize={data.pageSize}
    />
  );
}