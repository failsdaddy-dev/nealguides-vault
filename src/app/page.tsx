import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRightIcon, DownloadIcon, LockIcon, PlayIcon, SECTION_ICONS } from "@/components/icons";
import { LandingIntro } from "@/components/landing-intro";
import { Wordmark } from "@/components/top-bar";
import { APP_NAME, LOGO_SRC } from "@/lib/brand";

// Public front door for logged-out visitors. It shows no library content
// (no card titles, counts or links): only what the Vault is and a way to
// sign in. Signed-in visitors are sent to the library by the proxy.
// LandingIntro plays a short boot animation over it on first visit per tab.

const AREAS: { kind: keyof typeof SECTION_ICONS; title: string }[] = [
  { kind: "gameplay", title: "FC gameplay clips" },
  { kind: "effect", title: "Effects" },
  { kind: "music", title: "Music" },
  { kind: "background", title: "Backgrounds" },
];

const STEPS = [
  { icon: PlayIcon, title: "Preview", body: "Each asset is a card with a short preview." },
  { icon: DownloadIcon, title: "Download", body: "Open the file from wherever Neal keeps it." },
  { icon: LockIcon, title: "Private", body: "Sign-in required. Accounts are created by the admin." },
];

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingIntro />
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          <Link
            href="/login"
            className="vh-press inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg"
          >
            Sign in <ArrowRightIcon size={16} strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="ng-hero-glow relative overflow-hidden border-b border-line bg-navy">
          <div aria-hidden="true" className="ng-grid-lines absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-[1.2fr_1fr] md:py-28">
            <div>
              <p
                style={delay(0)}
                className="vh-hero-in inline-flex items-center gap-2 rounded-full border border-line bg-bg/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand"
              >
                <LockIcon size={13} /> Private asset library
              </p>
              <h1
                style={delay(1)}
                className="vh-hero-in mt-6 text-[clamp(2.75rem,7vw,5rem)] font-bold uppercase leading-[0.95] tracking-[0.005em]"
              >
                {APP_NAME} <span className="text-brand">Vault</span>
              </h1>
              <p style={delay(2)} className="vh-hero-in mt-5 max-w-xl text-lg text-fg-2">
                The clips, effects, music and backgrounds chosen for Neal Guides videos and Shorts, in one place for
                the editors who work on them.
              </p>
              <div style={delay(3)} className="vh-hero-in mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="vh-press inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 text-base font-semibold text-brand-fg"
                >
                  Sign in to the vault <ArrowRightIcon size={18} strokeWidth={2.2} />
                </Link>
              </div>
            </div>
            <div style={delay(2)} className="vh-hero-in hidden justify-center md:flex">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand file */}
              <img src={LOGO_SRC} alt="" width={300} height={300} className="ng-logo-light opacity-95" />
            </div>
          </div>
        </section>

        {/* What's inside + how it works */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-[0.01em]">Inside the vault</h2>
            <ul className="mt-6 grid grid-cols-2 gap-3">
              {AREAS.map(({ kind, title }) => {
                const Icon = SECTION_ICONS[kind];
                return (
                  <li key={kind} className="flex items-center gap-3 rounded-xl border border-line bg-bg-elev px-4 py-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand">
                      <Icon size={20} />
                    </span>
                    <span className="font-medium">{title}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-[0.01em]">How it works</h2>
            <ol className="mt-6 flex flex-col gap-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex items-start gap-4 rounded-xl border border-line bg-bg-elev px-4 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand">
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-fg-2">
                      Step {i + 1}
                    </span>
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-fg-2">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-fg-2 sm:px-6">
          <span>{APP_NAME} Vault. For invited editors only.</span>
          <Link href="/login" className="rounded hover:text-fg">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
