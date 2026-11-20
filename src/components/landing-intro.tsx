"use client";

// Game-style boot screen shown over the landing page once per browser tab:
// HUD frame, scanline, glitching logo, a loading bar, then a shutter that
// opens onto the page (about 3 seconds). The timeline is pure CSS (see
// "Landing intro" in globals.css), so it still plays and hides without JS.
// Skipped for visitors who prefer reduced motion and on repeat visits in
// the same tab. Skip with the button, a click, Esc, Enter or Space.

import { useCallback, useEffect, useState } from "react";
import { APP_NAME, LOGO_SRC } from "@/lib/brand";

const SEEN_KEY = "ng-intro-seen";
// play: the full timeline runs. exit: skipped, shutter opens fast.
// done / skipped: finished and hidden (kept mounted so the landing page's
// entrance timing in globals.css stays stable). off: not shown at all.
type Phase = "play" | "exit" | "done" | "skipped" | "off";

export function LandingIntro() {
  const [phase, setPhase] = useState<Phase>("play");

  useEffect(() => {
    // Only read here: the flag is written once the intro ends or is skipped,
    // so React's double-run of effects in development can't hide it.
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Storage blocked: just play it.
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only state
    if (seen || reduce) setPhase("off");
  }, []);

  const skip = useCallback(() => setPhase((p) => (p === "play" ? "exit" : p)), []);

  useEffect(() => {
    if (phase === "play" || phase === "off") return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage blocked: it will play again next visit.
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip]);

  if (phase === "off") return null;

  return (
    <div
      className={[
        "ng-intro",
        (phase === "exit" || phase === "skipped") && "ng-intro--exit",
        (phase === "done" || phase === "skipped") && "ng-intro--done",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={skip}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.animationName === "ng-intro-hide" || e.animationName === "ng-intro-hide-fast") {
          setPhase((p) => (p === "exit" ? "skipped" : "done"));
        }
      }}
    >
      <div className="ng-intro__panel ng-intro__panel--top" />
      <div className="ng-intro__panel ng-intro__panel--bottom" />

      <div className="ng-intro__stage" aria-hidden="true">
        <div className="ng-intro__scan" />
        <span className="ng-intro__corner ng-intro__corner--tl" />
        <span className="ng-intro__corner ng-intro__corner--tr" />
        <span className="ng-intro__corner ng-intro__corner--bl" />
        <span className="ng-intro__corner ng-intro__corner--br" />

        <div className="ng-intro__center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand file */}
          <img src={LOGO_SRC} alt="" width={180} height={180} className="ng-intro__logo" />
          <p className="ng-intro__title font-display">{APP_NAME}</p>
          <p className="ng-intro__sub font-display">Asset vault</p>

          <div className="ng-intro__loader">
            <div className="ng-intro__status font-display">
              <span className="ng-intro__status-load">Loading assets</span>
              <span className="ng-intro__status-ready">Vault ready</span>
              <span className="ng-intro__pct" />
            </div>
            <div className="ng-intro__bar">
              <div className="ng-intro__fill" />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
        className="ng-intro__skip font-display"
      >
        Skip intro
      </button>
    </div>
  );
}
