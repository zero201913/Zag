"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "../icons";

export function LoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || "指令代码不正确");
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("网络错误，请稍后再试");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="glass-strong reveal grid w-full max-w-[900px] overflow-hidden rounded-[34px] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Decorative */}
        <div className="relative hidden overflow-hidden p-9 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,var(--accent),transparent_55%),radial-gradient(100%_100%_at_100%_100%,var(--accent-2),transparent_55%),radial-gradient(100%_100%_at_50%_60%,var(--accent-3),transparent_70%)] opacity-25" />
          <div className="relative">
            <Link href="/" className="brand">
              <span className="brand-orb" />
              <span>
                Zag<span className="text-[var(--accent-3)]">.</span>
              </span>
            </Link>
            <p className="mt-10 max-w-xs text-[1.55rem] font-semibold leading-snug tracking-[-0.035em]">
              玻璃后面，
              <br />
              是内容的家。
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              文章、项目、收藏、照片与音乐，都从这里管理。
            </p>
          </div>

          <div className="relative mt-10 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_30%,transparent)] p-4 font-mono text-[0.7rem] leading-relaxed text-muted backdrop-blur-md">
            <p><span className="text-[var(--accent-3)]">$</span> d1 query &quot;posts&quot; --limit 3</p>
            <p className="mt-1 opacity-70">✓ 3 rows · D1 connected</p>
            <p><span className="text-[var(--accent-3)]">$</span> r2 ls photos/</p>
            <p className="mt-1 opacity-70">✓ bucket ready · immutable</p>
            <p className="mt-2"><span className="text-[var(--accent)]">●</span> waiting for command code…</p>
          </div>

          <p className="relative mt-8 text-[0.68rem] tracking-[0.08em] text-muted">
            ZAG ADMIN · D1 + R2 + WORKERS
          </p>
        </div>

        {/* Form */}
        <div className="p-7 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="chip chip-accent">
              <Icon name="lock" size={12} />
              Admin Access
            </span>
            <Link href="/" className="text-xs text-muted transition-colors hover:text-[var(--text)]">
              返回首页
            </Link>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em]">输入指令代码</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            这里不是公开页面。输入你的专属指令，才能进入内容后台。
          </p>

          <form onSubmit={submit} className="mt-7">
            <label className="label" htmlFor="admin-code">
              专属指令 · Command Code
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <Icon name="key" size={17} />
              </span>
              <input
                id="admin-code"
                type={show ? "text" : "password"}
                className="field !py-3.5 !pl-11 !pr-12 font-mono tracking-[0.14em]"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ZAG-XXXX-XXXX"
                autoComplete="current-password"
                autoFocus
                spellCheck={false}
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition-colors hover:text-[var(--text)]"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? "隐藏指令" : "显示指令"}
              >
                <Icon name={show ? "eye-off" : "eye"} size={17} />
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/8 px-3 py-2.5 text-xs text-red-400">
                <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary mt-5 w-full !py-3.5" disabled={loading}>
              {loading ? (
                <>
                  <Icon name="loader" size={16} className="animate-spin" />
                  正在验证…
                </>
              ) : (
                <>
                  进入后台
                  <Icon name="arrow-right" size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--glass-soft)] p-4 text-[0.72rem] leading-relaxed text-muted">
            <p className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
              <Icon name="sparkles" size={13} className="text-[var(--accent)]" />
              提示
            </p>
            <p className="mt-1">
              初始指令在项目的 <code className="font-mono">.dev.vars</code> 里；
              线上使用 <code className="font-mono">wrangler secret put ADMIN_ACCESS_CODE</code> 设置。
              登录后可在「设置 → 安全」里修改。
            </p>
          </div>

          <p className="mt-6 text-center text-[0.66rem] tracking-[0.08em] text-muted">
            PROTECTED BY SESSION · RATE LIMITED
          </p>
        </div>
      </div>
    </div>
  );
}