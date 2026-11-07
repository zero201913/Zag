import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="reveal mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <span className="eyebrow">
          <span className="eyebrow-dot" />
          {eyebrow}
        </span>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.2rem)]">{title}</h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-[0.95rem]">
            {description}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}