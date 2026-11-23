"use client";

// Small, consistent building blocks for the admin panel.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { TITLE_SUFFIX } from "@/lib/brand";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/filters", label: "Filters" },
  { href: "/admin/sections", label: "Side menu" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminFrame({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-16 max-sm:px-3">
      <title>{`${title} · Admin${TITLE_SUFFIX}`}</title>
      <nav aria-label="Admin" className="ng-tabs no-scrollbar sticky top-14 z-20 -mx-1.5 bg-bg/95 px-1.5 pt-2 backdrop-blur">
        {TABS.map((t) => {
          const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className="ng-tab">
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3 pb-6 pt-6">
        <div>
          <p className="ng-tag">Admin console</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-[0.04em]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "plain" | "danger" | "ghost" };

export function Button({ variant = "plain", className = "", ...rest }: BtnProps) {
  // primary: the green angled HUD button (globals.css .vh-press.bg-brand).
  const look = {
    primary: "bg-brand text-brand-fg text-[13px]",
    plain: "ng-abtn",
    danger: "ng-abtn is-danger",
    ghost: "ng-abtn is-ghost",
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      className={`vh-press inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
    />
  );
}

export function ButtonLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`vh-press inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 ${
        primary ? "bg-brand text-brand-fg text-[13px]" : "ng-abtn"
      }`}
    >
      {children}
    </Link>
  );
}

/** Two-step confirm without browser dialogs: first click arms, second click acts. */
export function ConfirmButton({ onConfirm, children, confirmLabel = "Click again to confirm", disabled }: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant={armed ? "danger" : "ghost"}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}

const FIELD = "w-full rounded-sm border border-[var(--search-border)] bg-[var(--search-bg)] px-3 text-sm outline-none vh-field";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm ${className}`}>
      <span className="ng-label">{label}</span>
      {children}
      {hint && <span className="text-xs text-fg-2">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} h-10 ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD} min-h-24 py-2 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD} h-10 pl-3 pr-3 ${props.className ?? ""}`} />;
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 text-sm"
    >
      <span className="ng-switch-track" aria-hidden="true">
        <span className="ng-switch-knob" />
      </span>
      {label}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ng-panel p-4 ${className}`}>{children}</section>;
}

export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "red" | "green" }) {
  const look = { plain: "", red: "is-red", green: "is-green" }[tone];
  return <span className={`ng-chip ${look}`}>{children}</span>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-4 border-l-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-sm">
      {children}
    </p>
  );
}

export function SampleModeNote() {
  return (
    <Panel>
      <p className="font-medium">The admin panel needs Supabase.</p>
      <p className="mt-1 text-sm text-fg-2">
        Fill in <code>.env.local</code> (see README) and restart the app. Until then the library shows sample data.
      </p>
    </Panel>
  );
}

export const TABLE = "ng-table w-full border-collapse text-sm [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:uppercase [&_th]:text-fg-2";
