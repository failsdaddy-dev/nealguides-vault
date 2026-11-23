"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { APP_NAME, HOME_PATH, LOGO_SRC } from "@/lib/brand";
import { useHub } from "./hub-context";
import { BackIcon, CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { UserMenu } from "./user-menu";

/** Official NealGuides emblem + the product name. The logo file is black on
 *  transparent, so it is inverted to white on the dark theme. */
export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <span className="flex select-none items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static brand file */}
      <img src={LOGO_SRC} alt="" width={size} height={size} className="ng-logo-light shrink-0" />
      <span className="font-display text-[21px] font-bold uppercase leading-none tracking-[0.06em]">{APP_NAME}</span>
    </span>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`ng-icon-btn ${className}`}
    >
      {children}
    </button>
  );
}

function SearchForm({ autoFocus, onDone, hotkey }: { autoFocus?: boolean; onDone?: () => void; hotkey?: boolean }) {
  const { state, go, section } = useBrowseUrl();
  const [value, setValue] = useState(state.q);
  const input = useRef<HTMLInputElement>(null);

  // Keep the box in step with the URL (back/forward, chip clicks).
  const [syncedQ, setSyncedQ] = useState(state.q);
  if (syncedQ !== state.q) {
    setSyncedQ(state.q);
    setValue(state.q);
  }
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  // "/" jumps to the search box (desktop bar only), unless typing elsewhere.
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go({ q: value }, { toSection: section });
    input.current?.blur();
    onDone?.();
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="ng-search"
    >
      <div className="flex h-full min-w-0 flex-1 items-center pl-4">
        <SearchIcon size={18} className="ng-search-icon mr-2.5 shrink-0" />
        <input
          ref={input}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search clips, effects, music..."
          aria-label="Search"
          maxLength={200}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              input.current?.focus();
            }}
            className="ng-icon-btn is-sm mr-1"
          >
            <CloseIcon size={18} />
          </button>
        )}
        {hotkey && !value && (
          <span className="ng-kbd mr-3 max-md:hidden" aria-hidden="true" title="Press / to search">
            /
          </span>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        title="Search"
        className="ng-search-go"
      >
        <SearchIcon size={20} />
      </button>
    </form>
  );
}

export function TopBar() {
  const { toggleGuide } = useHub();
  const [mobileSearch, setMobileSearch] = useState(false);

  if (mobileSearch) {
    return (
      <header className="ng-hud-line fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-bg px-2">
        <IconButton label="Back" onClick={() => setMobileSearch(false)}>
          <BackIcon />
        </IconButton>
        <SearchForm autoFocus onDone={() => setMobileSearch(false)} />
      </header>
    );
  }

  return (
    <header className="ng-hud-line fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-6 border-b border-line bg-bg/90 px-4 backdrop-blur max-sm:gap-2 max-sm:px-2 sm:grid sm:grid-cols-[1fr_minmax(0,600px)_1fr]">
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <IconButton label="Menu" onClick={toggleGuide}>
          <MenuIcon />
        </IconButton>
        <Link href={HOME_PATH} aria-label={`${APP_NAME} home`} className="px-2 py-1 transition-opacity hover:opacity-85">
          <Wordmark />
        </Link>
      </div>

      <div className="hidden min-w-0 sm:block">
        <SearchForm hotkey />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <IconButton label="Search" onClick={() => setMobileSearch(true)} className="sm:hidden">
          <SearchIcon />
        </IconButton>
        <UserMenu />
      </div>
    </header>
  );
}
