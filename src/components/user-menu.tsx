"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useHub } from "./hub-context";
import { LogoutIcon, ShieldIcon } from "./icons";
import { useDismiss } from "./popover";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} className="ng-avatar">
      {initials || "?"}
    </span>
  );
}

export function UserMenu() {
  const { user } = useHub();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, box, close);
  const admin = user.role === "admin";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ng-avatar-btn vh-press ml-1 grid size-10 place-items-center"
      >
        <Avatar name={user.displayName} />
      </button>
      {open && (
        <div role="menu" className="vh-pop-in ng-frame absolute right-0 top-12 z-50 w-[300px] origin-top-right overflow-hidden p-1.5">
          <div className="ng-frame-head -mx-1.5 -mt-1.5 mb-1.5 flex gap-3 px-4 pb-3 pt-3.5">
            <Avatar name={user.displayName} size={42} />
            <div className="min-w-0">
              <p className="ng-frame-title truncate text-[15px]">{user.displayName}</p>
              <p className="truncate text-sm text-fg-2">{user.email}</p>
              <span className={`ng-chip mt-1.5 ${admin ? "is-green" : ""}`}>{admin ? "Admin" : "Editor"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            {admin && (
              <Link href="/admin" role="menuitem" onClick={close} className="vh-menu-item ng-menu-item flex items-center gap-3">
                <ShieldIcon size={18} />
                Admin panel
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button type="submit" role="menuitem" className="vh-menu-item ng-menu-item flex w-full items-center gap-3 text-left">
                <LogoutIcon size={18} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
