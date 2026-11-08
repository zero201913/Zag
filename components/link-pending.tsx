"use client";

import { useLinkStatus } from "next/link";

/** 导航链接的即时反馈：数据还没到达时显示一个小脉冲。 */
export function LinkPending() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`link-pending ${pending ? "is-pending" : ""}`}
    />
  );
}