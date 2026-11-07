import Link from "next/link";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="page-wrap flex min-h-[62vh] flex-col items-center justify-center text-center">
      <div className="glass reveal w-full max-w-lg rounded-[32px] p-10">
        <span className="eyebrow mx-auto">
          <span className="eyebrow-dot" />
          404 · Lost in glass
        </span>
        <p className="display mt-4 text-[clamp(4rem,14vw,7rem)] leading-none gradient-text">404</p>
        <h1 className="mt-2 text-xl font-semibold">这一页飘走了</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          可能是链接写错了，也可能内容已经被收进别的地方。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            <Icon name="home" size={15} />
            回到首页
          </Link>
          <Link href="/posts" className="btn">
            看看文章
            <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}