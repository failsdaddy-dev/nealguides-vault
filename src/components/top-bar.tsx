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
      <span className="font-display text-[21px] font-semibold uppercase leading-none tracking-[0.04em]">{APP_NAME}</span>
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
      className={`vh-press no-lift grid size-10 shrink-0 place-items-center rounded-full hover:bg-hover active:bg-press ${className}`}
    >
      {children}
    </button>
  );
}

function SearchForm({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
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
      className="vh-field group flex h-10 w-full max-w-[640px] items-center overflow-hidden rounded-full border border-[var(--search-border)] bg-[var(--search-bg)]"
    >
      <div className="flex h-full min-w-0 flex-1 items-center pl-4">
        <SearchIcon size={18} className="mr-2 hidden shrink-0 text-fg-2 group-focus-within:block" />
        <input
          ref={input}
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search clips, effects, music…"
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
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-hover"
          >
            <CloseIcon size={20} />
          </button>
        )}
      </div>
      <button
        type="submit"
        aria-label="Search"
        title="Search"
        className="grid h-full w-16 shrink-0 place-items-center border-l border-[var(--search-border)] bg-[var(--search-btn)] transition-colors duration-[var(--dur-1)] hover:bg-chip-hover"
      >
        <SearchIcon size={22} />
      </button>
    </form>
  );
}

export function TopBar() {
  const { toggleGuide } = useHub();
  const [mobileSearch, setMobileSearch] = useState(false);

  if (mobileSearch) {
    return (
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 bg-bg px-2">
        <IconButton label="Back" onClick={() => setMobileSearch(false)}>
          <BackIcon />
        </IconButton>
        <SearchForm autoFocus onDone={() => setMobileSearch(false)} />
      </header>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-line bg-bg/90 px-4 backdrop-blur max-sm:px-2">
      <div className="flex shrink-0 items-center gap-2">
        <IconButton label="Menu" onClick={toggleGuide}>
          <MenuIcon />
        </IconButton>
        <Link href={HOME_PATH} aria-label={`${APP_NAME} home`} className="rounded-md px-2 py-1">
          <Wordmark />
        </Link>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center sm:flex">
        <SearchForm />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Search" onClick={() => setMobileSearch(true)} className="sm:hidden">
          <SearchIcon />
        </IconButton>
        <UserMenu />
      </div>
    </header>
  );
}
