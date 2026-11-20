import type { ReactNode } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { HudTag, Reticle } from "./hud";
import { LockIcon } from "./icons";
import { Wordmark } from "./top-bar";

// Frame for the pages people see outside the library: sign in, no access,
// page not found. Desktop: a HUD brand panel with the emblem in a reticle on
// the left, the content on the right. Phones: just the header and the content.

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <div className="ng-hero-glow relative hidden overflow-hidden border-r border-line lg:block">
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="w-fit rounded-md">
            <Wordmark />
          </Link>
          <div className="vh-route-in">
            <Reticle size={200} />
            <HudTag className="mt-10">Private asset library</HudTag>
            <p className="font-display mt-4 text-[clamp(2.6rem,4vw,3.75rem)] font-bold uppercase leading-[0.92] tracking-[0.01em]">
              The editors&apos;
              <br />
              <span className="ng-glow text-brand">vault</span>
            </p>
            <p className="mt-4 max-w-sm text-base text-fg-2">
              The clips, effects, music and backgrounds Neal has chosen for his videos, in one private place.
            </p>
          </div>
          <p className="ng-tag no-bar text-fg-2">
            <span className="ng-dot" /> <LockIcon size={13} /> Invite only. Every sign-in and download is recorded.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-screen flex-col">
        <header className="ng-hud-line flex items-center border-b border-line px-5 py-4 sm:px-8 lg:hidden">
          <Link href="/" className="rounded-md" aria-label={`${APP_NAME} home`}>
            <Wordmark />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-4 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

/** The card the form or message sits in. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="ng-panel vh-pop-in w-full max-w-[420px] p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] max-sm:p-6">
      {children}
    </div>
  );
}
