import Link from "next/link";
import { Icon, type IconName } from "./icons";

export function EmptyState({
  icon = "sparkles",
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="glass-soft rounded-[26px] px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-primary mt-5">
          {actionLabel}
          <Icon name="arrow-right" size={15} />
        </Link>
      )}
    </div>
  );
}