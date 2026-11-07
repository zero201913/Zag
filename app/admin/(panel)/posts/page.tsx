import { PostsManager } from "@/components/admin/posts-manager";
import { listAdminPosts } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "文章管理" };

export default async function AdminPostsPage() {
  const posts = await listAdminPosts();
  return <PostsManager initial={posts} />;
}