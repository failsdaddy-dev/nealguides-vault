import Link from "next/link";
import type { ReactNode } from "react";

export function CardSkeleton() {
  return (
    <div className="ng-panel flex flex-col" aria-hidden="true">
      <div className="vh-skeleton aspect-video" />
      <div className="flex flex-col gap-2 p-3.5">
        <div className="vh-skeleton h-4 w-[90%] rounded-sm" />
        <div className="vh-skeleton h-4 w-[60%] rounded-sm" />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <div className="vh-skeleton h-9 rounded-sm" />
          <div className="vh-skeleton h-9 rounded-sm" />
          <div className="vh-skeleton h-9 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

// HUD card grid: framed cards in an even grid.
export const GRID_CLASS =
  "grid grid-cols-1 gap-4 px-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] sm:gap-5 sm:px-0";

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASS} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MessageState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="vh-fade-in mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      {icon && <div className="ng-cut mb-2 grid size-20 place-items-center bg-brand/10 text-brand [--cut:14px]">{icon}</div>}
      <h2 className="text-2xl font-bold uppercase tracking-[0.02em]">{title}</h2>
      {body && <div className="text-fg-2">{body}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PillLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="ng-btn-ghost h-10 px-5 text-xs"
    >
      {children}
    </Link>
  );
}
