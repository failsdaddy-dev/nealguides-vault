import type { ReactNode } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { HudTag, Reticle } from "./hud";
import { BackIcon, LockIcon } from "./icons";
import { Wordmark } from "./top-bar";

// Frame for the pages people see outside the library: sign in, no access,
// page not found. A game-style login console: HUD header, a large faint
// reticle behind, and one framed panel (brand side + content side) in the
// middle. On phones the brand side is hidden and only the content shows.

const READOUTS = [
  { label: "Access", value: "Invite only" },
  { label: "Sign-in", value: "Rate limited" },
  { label: "Logged", value: "Every sign-in and download" },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* HUD header */}
      <header className="ng-hud-line relative z-10 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-md" aria-label={`${APP_NAME} home`}>
            <Wordmark />
          </Link>
          <div className="flex items-center gap-5">
            <span className="ng-tag no-bar hidden text-fg-2 sm:inline-flex">
              <span className="ng-dot" /> Invite only
            </span>
            <Link href="/" className="ng-btn-ghost h-10 px-4 text-xs">
              <BackIcon size={14} strokeWidth={2.4} /> Home
            </Link>
          </div>
        </div>
      </header>

      {/* Console */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
        <div aria-hidden="true" className="ng-hero-glow absolute inset-0" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 opacity-[0.07] lg:block">
          <Reticle size={980} />
        </div>

        <div className="ng-panel ng-corners-4 vh-pop-in relative w-full max-w-5xl shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]">
          {/* title strip */}
          <div className="flex items-center justify-between gap-4 border-b border-line bg-bg/40 px-5 py-3">
            <span className="ng-tag">Editor access</span>
            <span className="ng-tag no-bar text-fg-2">{APP_NAME} Vault</span>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
            {/* Brand side */}
            <div className="relative hidden flex-col justify-between gap-10 border-r border-line p-10 lg:flex">
              <div className="flex items-center gap-8">
                <Reticle size={150} />
                <div>
                  <HudTag>Private asset library</HudTag>
                  <p className="font-display mt-3 text-[2.75rem] font-bold uppercase leading-[0.92]">
                    The editors&apos;
                    <span className="ng-glow block text-brand">vault</span>
                  </p>
                </div>
              </div>
              <p className="max-w-md text-base text-fg-2">
                The clips, effects, music and backgrounds Neal has chosen for his videos, in one private place.
              </p>
              <dl className="divide-y divide-line border-y border-line">
                {READOUTS.map(({ label, value }) => (
                  <div key={label} className="ng-readout flex items-center justify-between gap-4 py-3">
                    <dt>{label}</dt>
                    <dd className="mt-0! text-right text-brand">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Content side */}
            <div className="p-8 max-sm:p-6 lg:p-10">{children}</div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <span className="ng-tag no-bar text-[10px] text-fg-2">
            <LockIcon size={12} /> Every sign-in and download is recorded
          </span>
          <span className="ng-tag no-bar text-[10px] text-fg-2">{APP_NAME} Vault</span>
        </div>
      </footer>
    </div>
  );
}

/** The content block inside the console (form or message). */
export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="vh-route-in w-full">{children}</div>;
}
