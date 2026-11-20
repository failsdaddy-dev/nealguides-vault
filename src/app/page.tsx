import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRightIcon, DownloadIcon, LockIcon, PlayIcon, SECTION_ICONS } from "@/components/icons";
import { HudTag, Reticle, Ticker } from "@/components/hud";
import { LandingIntro } from "@/components/landing-intro";
import { Wordmark } from "@/components/top-bar";
import { APP_NAME } from "@/lib/brand";

// Public front door for logged-out visitors. It shows no library content
// (no card titles, counts or links): only what the Vault is and a way to
// sign in. Signed-in visitors are sent to the library by the proxy.
// LandingIntro plays a short boot animation over it on first visit per tab.
// Every line of copy here comes from the brief; nothing is invented.

const AREAS: { kind: keyof typeof SECTION_ICONS; title: string; note: string }[] = [
  { kind: "gameplay", title: "FC gameplay clips", note: "Includes Shorts" },
  { kind: "effect", title: "Effects", note: "Preview before you download" },
  { kind: "music", title: "Music", note: "Listen before you download" },
  { kind: "background", title: "Backgrounds", note: "Preview before you download" },
];

const STEPS = [
  { icon: PlayIcon, title: "Preview", body: "Each asset is a card with a short preview." },
  { icon: DownloadIcon, title: "Download", body: "Open the file from wherever Neal keeps it." },
  { icon: LockIcon, title: "Private", body: "Sign-in required. Accounts are created by the admin." },
];

const READOUTS = [
  { label: "Access", value: "Invite only" },
  { label: "Built for", value: "Videos + Shorts" },
  { label: "Logged", value: "Every download" },
];

const TICKER = ["FC gameplay clips", "Shorts", "Effects", "Music", "Backgrounds"];

const delay = (i: number) => ({ "--i": i }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingIntro />

      {/* Header */}
      <header className="ng-hud-line sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-5">
            <span className="ng-tag no-bar hidden text-fg-2 sm:inline-flex">
              <span className="ng-dot" /> Invite only
            </span>
            <Link
              href="/login"
              className="vh-press inline-flex h-10 items-center gap-2 bg-brand px-5 text-sm text-brand-fg"
            >
              Sign in <ArrowRightIcon size={16} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="ng-hero-glow absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.25fr_1fr] md:py-24">
            <div>
              <div style={delay(0)} className="vh-hero-in">
                <HudTag>
                  <LockIcon size={13} /> Private asset library
                </HudTag>
              </div>
              <h1
                style={delay(1)}
                className="vh-hero-in mt-6 text-[clamp(3rem,8vw,5.75rem)] font-bold uppercase leading-[0.9] tracking-[0.01em]"
              >
                {APP_NAME}
                <span className="ng-glow block text-brand">Vault</span>
              </h1>
              <p style={delay(2)} className="vh-hero-in mt-6 max-w-xl text-lg text-fg-2">
                The clips, effects, music and backgrounds chosen for Neal Guides videos and Shorts, in one place for
                the editors who work on them.
              </p>
              <div style={delay(3)} className="vh-hero-in mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="vh-press inline-flex h-13 items-center gap-2.5 bg-brand px-8 text-base text-brand-fg"
                >
                  Sign in to the vault <ArrowRightIcon size={18} strokeWidth={2.4} />
                </Link>
                <a href="#inside" className="ng-btn-ghost h-13 px-7 text-base">
                  What&apos;s inside
                </a>
              </div>
              <dl
                style={delay(4)}
                className="vh-hero-in mt-12 grid max-w-xl grid-cols-3 divide-x divide-line border-y border-line"
              >
                {READOUTS.map(({ label, value }) => (
                  <div key={label} className="ng-readout px-4 py-3 first:pl-0">
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div style={delay(2)} className="vh-hero-in hidden justify-center md:flex">
              <Reticle size={380} />
            </div>
          </div>
        </section>

        <Ticker items={TICKER} />

        {/* Inside the vault */}
        <section id="inside" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <HudTag>Select a category</HudTag>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-bold uppercase leading-none">Inside the vault</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AREAS.map(({ kind, title, note }, i) => {
              const Icon = SECTION_ICONS[kind];
              return (
                <li key={kind} className="ng-panel is-interactive group flex min-h-48 flex-col overflow-hidden p-5">
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center border border-[color-mix(in_srgb,var(--green)_40%,transparent)] bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg">
                      <Icon size={22} />
                    </span>
                    <span className="ng-index text-5xl">{pad(i + 1)}</span>
                  </div>
                  <div className="mt-auto pt-8">
                    <p className="font-display text-xl font-bold uppercase leading-tight tracking-[0.02em]">{title}</p>
                    <p className="mt-1 text-sm text-fg-2">{note}</p>
                    <p className="ng-tag no-bar mt-4 text-fg-2 transition-colors group-hover:text-brand">
                      <LockIcon size={12} /> Sign in to open
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section className="border-y border-line bg-bg-elev/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <HudTag>Three steps</HudTag>
            <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-bold uppercase leading-none">How it works</h2>
            <ol className="relative mt-12 grid gap-4 md:grid-cols-3">
              {/* connecting line behind the step nodes */}
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-6 hidden h-px bg-[linear-gradient(90deg,var(--green),color-mix(in_srgb,var(--green)_15%,transparent))] md:block"
              />
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative">
                  <span className="ng-cut relative grid size-12 place-items-center bg-brand text-brand-fg">
                    <Icon size={20} />
                  </span>
                  <div className="ng-panel mt-5 p-5">
                    <p className="ng-tag no-bar text-fg-2">Step {pad(i + 1)}</p>
                    <p className="font-display mt-2 text-2xl font-bold uppercase">{title}</p>
                    <p className="mt-1 text-fg-2">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="ng-panel relative flex flex-col items-start justify-between gap-6 overflow-hidden p-8 md:flex-row md:items-center md:p-12">
            <div aria-hidden="true" className="ng-hero-glow absolute inset-0 opacity-70" />
            <div className="relative">
              <HudTag>Editors only</HudTag>
              <p className="font-display mt-3 text-[clamp(1.8rem,4vw,2.75rem)] font-bold uppercase leading-none">
                Ready to <span className="ng-glow text-brand">edit?</span>
              </p>
              <p className="mt-3 text-fg-2">Sign in with the login the admin gave you.</p>
            </div>
            <Link
              href="/login"
              className="vh-press relative inline-flex h-13 shrink-0 items-center gap-2.5 bg-brand px-8 text-base text-brand-fg"
            >
              Sign in <ArrowRightIcon size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <span className="ng-tag no-bar text-fg-2">{APP_NAME} Vault / Invited editors only</span>
          <Link href="/login" className="ng-tag no-bar rounded text-fg-2 hover:text-brand">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
