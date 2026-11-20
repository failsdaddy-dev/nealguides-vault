"use client";

// Email + password sign-in through /api/auth/login (server side, rate
// limited). A visitor who is already signed in on this browser is sent on.
// Arriving with ?signed_out=1 tells this browser's other tabs to leave too.

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/icons";
import { broadcastSignOut } from "@/lib/session-sync";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_CONFIGURED } from "@/lib/supabase/env";
import { safeNext } from "@/lib/url-state";

const FIELD =
  "vh-field flex h-12 items-center gap-3 rounded-xl border border-[var(--search-border)] bg-[var(--search-bg)] px-4 font-normal";
const INPUT =
  "h-full min-w-0 flex-1 bg-transparent font-sans text-base normal-case tracking-normal text-fg outline-none placeholder:text-fg-2/60";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const signedOut = params.get("signed_out") === "1";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(SUPABASE_CONFIGURED && !signedOut);
  const [showPassword, setShowPassword] = useState(false);

  const finish = () => {
    router.replace(next);
    router.refresh();
  };

  useEffect(() => {
    if (signedOut) {
      broadcastSignOut();
      return;
    }
    if (!SUPABASE_CONFIGURED) return;
    // Already signed in on this browser? Don't ask for the password again.
    let live = true;
    (async () => {
      const { data } = await supabaseBrowser().auth.getUser();
      if (!live) return;
      if (!data.user) return setChecking(false);
      router.replace(next);
      router.refresh();
    })();
    return () => {
      live = false;
    };
  }, [next, router, signedOut]);

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!SUPABASE_CONFIGURED) return finish();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Sign-in failed. Try again.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
      setBusy(false);
      return;
    }
    finish();
  };

  if (checking) return null;

  return (
    <form onSubmit={signIn} className="flex flex-col gap-5">
      <div>
        <p className="ng-tag">Editors only</p>
        <h1 className="mt-3 text-4xl font-bold uppercase tracking-[0.01em]">Sign in</h1>
        <p className="mt-1.5 text-sm text-fg-2">
          {signedOut ? "You’ve been signed out on this browser." : "Use the login the admin gave you."}
        </p>
      </div>
      <label className="flex flex-col gap-1.5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-fg-2">
        Email
        <span className={FIELD}>
          <MailIcon size={18} className="shrink-0 text-fg-2" />
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            maxLength={254}
            placeholder="you@example.com"
            className={INPUT}
          />
        </span>
      </label>
      <label className="flex flex-col gap-1.5 font-display text-xs font-semibold uppercase tracking-[0.18em] text-fg-2">
        Password
        <span className={FIELD}>
          <LockIcon size={18} className="shrink-0 text-fg-2" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            maxLength={200}
            placeholder="••••••••••"
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="-mr-2 grid size-8 shrink-0 place-items-center rounded-full text-fg-2 transition-colors hover:bg-hover hover:text-fg"
          >
            {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="vh-press inline-flex h-12 items-center justify-center gap-2 bg-brand text-brand-fg disabled:opacity-60"
      >
        {busy ? "Checking…" : "Sign in"}
        {!busy && <ArrowRightIcon size={18} strokeWidth={2.2} />}
      </button>
      <p className="border-t border-line pt-4 text-xs leading-5 text-fg-2">
        There is no public sign-up. Forgot your password or lost access? Ask the admin.
        {!SUPABASE_CONFIGURED && (
          <>
            <br />
            <span className="opacity-80">Sample mode (development only): Supabase isn’t configured, so any input opens the sample library.</span>
          </>
        )}
      </p>
    </form>
  );
}
