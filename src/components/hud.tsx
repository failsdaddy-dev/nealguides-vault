import type { CSSProperties, ReactNode } from "react";
import { LOGO_SRC } from "@/lib/brand";

// Shared gaming (HUD) pieces. Styles live in globals.css under "HUD parts".
// Reuse these on new pages so the whole app keeps one look.

/** The official emblem inside a reticle: rings, rotating arc, crosshair ticks. */
export function Reticle({ size = 320, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`ng-reticle ${className}`} style={{ "--size": `${size}px` } as CSSProperties} aria-hidden="true">
      <span className="ng-reticle__glow" />
      <span className="ng-reticle__ring" />
      <span className="ng-reticle__arc" />
      <span className="ng-reticle__dash" />
      <span className="ng-reticle__ticks" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand file */}
      <img src={LOGO_SRC} alt="" width={size} height={size} />
    </div>
  );
}

/** Green caps label with a glowing bar: "— SECTION NAME". */
export function HudTag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`ng-tag ${className}`}>{children}</p>;
}

/** Endless scrolling band of words (decorative; hidden from screen readers). */
export function Ticker({ items }: { items: string[] }) {
  const row = [...items, ...items, ...items, ...items];
  return (
    <div className="ng-ticker" aria-hidden="true">
      <div className="ng-ticker__track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex">
            {row.map((item, i) => (
              <span key={`${copy}-${i}`} className="ng-ticker__item">
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
