"use client";

// The card grid for one section: filters and search from the URL, infinite
// scroll with a cursor, skeletons, and empty/error states (R21).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDataSource, matchesFilters, searchScore } from "@/lib/data-source";
import type { Card, Cursor, Section } from "@/lib/types";
import { useBrowseUrl } from "@/lib/use-browse-url";
import { buildHref } from "@/lib/url-state";
import { useCardSaved } from "./card-edit";
import { ChipBar } from "./chip-bar";
import { useHub } from "./hub-context";
import { FolderIcon, SearchIcon, SECTION_ICONS, TuneIcon } from "./icons";
import { CardSkeleton, GRID_CLASS, GridSkeleton, MessageState } from "./states";
import { VideoCard } from "./video-card";

type Status = "loading" | "ready" | "error";

/** Section title bar with subsection tabs (HUD style). */
function SectionHeader({ section, sub, count }: { section: Section; sub?: string; count: number | null }) {
  const { state } = useBrowseUrl(section.slug);
  const Icon = SECTION_ICONS[section.kind] ?? FolderIcon;
  const subs = section.subsections ?? [];
  const current = subs.find((x) => x.slug === sub);
  const tabs = [
    ...(section.partial ? [] : [{ slug: undefined as string | undefined, name: "All" }]),
    ...subs.map((x) => ({ slug: x.slug as string | undefined, name: x.name })),
  ];
  return (
    <header className="ng-section-head vh-route-in">
      <div className="flex min-w-0 items-center gap-4">
        <span className="ng-cut grid size-12 shrink-0 place-items-center bg-brand text-brand-fg [--cut:9px]">
          <Icon size={24} />
        </span>
        <div className="min-w-0">
          <p className="ng-tag">
            Vault<span className="text-fg-2">/ {section.name}</span>
          </p>
          <h1 className="mt-1.5 truncate text-[clamp(1.6rem,3vw,2.25rem)] font-bold uppercase leading-none tracking-[0.02em]">
            {current ? current.name : section.name}
          </h1>
        </div>
        {count !== null && (
          <span className="ng-tag no-bar ml-auto hidden shrink-0 text-fg-2 sm:inline-flex">
            <span className="text-fg">{count}</span>
            {count === 1 ? "card" : "cards"}
            {count >= 24 ? "+" : ""}
          </span>
        )}
      </div>
      {subs.length > 0 && (
        <nav aria-label={`${section.name} subsections`} className="ng-tabs no-scrollbar">
          {tabs.map((t) => {
            const active = (t.slug ?? null) === (current?.slug ?? null);
            return (
              <Link
                key={t.slug ?? "all"}
                href={buildHref(section.slug, { ...state, sub: t.slug })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className="ng-tab"
              >
                {t.name}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

export function BrowseView({ section }: { section: Section }) {
  const { state, go, clearFilters } = useBrowseUrl(section.slug);
  const [items, setItems] = useState<Card[]>([]);
  const [next, setNext] = useState<Cursor | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const request = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const [attempt, setAttempt] = useState(0);
  const key = `${section.slug}|${state.sub ?? ""}|${state.filters.join(",")}|${state.q}|${state.sort}|${attempt}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // A new query resets the list immediately (render-time reset, no flash of old cards).
  if (loadedKey !== key) {
    setLoadedKey(key);
    setStatus("loading");
    setItems([]);
    setNext(null);
  }

  useEffect(() => {
    const id = ++request.current;
    getDataSource()
      .browse({ section: section.slug, sub: state.sub, filters: state.filters, q: state.q, sort: state.sort })
      .then((page) => {
        if (id !== request.current) return;
        setItems(page.items);
        setNext(page.next);
        setStatus("ready");
      })
      .catch(() => id === request.current && setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the query
  }, [key]);

  useEffect(() => {
    let live = true;
    getDataSource()
      .filterCounts(section.slug, state.sub)
      .then((c) => live && setCounts(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [section.slug, state.sub]);

  const loadMore = useCallback(() => {
    if (!next || loadingMore || status !== "ready") return;
    const id = request.current;
    setLoadingMore(true);
    getDataSource()
      .browse({ section: section.slug, sub: state.sub, filters: state.filters, q: state.q, sort: state.sort }, next)
      .then((page) => {
        if (id !== request.current) return;
        setItems((prev) => [...prev, ...page.items]);
        setNext(page.next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [next, loadingMore, status, section.slug, state.sub, state.filters, state.q, state.sort]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loadMore]);

  const retry = () => setAttempt((a) => a + 1);

  // Admin saved a card from the Edit drawer: refresh just that card in place
  // (same fields as the list), or take it out if it no longer belongs in
  // this view. Filters, search, URL and scroll position stay as they are.
  const { filters } = useHub();
  useCardSaved(async (saved) => {
    if (!items.some((c) => c.id === saved.id)) return;
    const fresh =
      saved.status === "published" && saved.sectionSlug === section.slug
        ? await getDataSource().card(saved.sectionSlug, saved.slug)
        : null;
    const fits =
      !!fresh &&
      (!state.sub || fresh.subsectionSlug === state.sub) &&
      matchesFilters(fresh, state.filters, filters) && (!state.q || searchScore(fresh, state.q, filters) > 0);
    setItems((prev) => (fits ? prev.map((c) => (c.id === saved.id ? fresh! : c)) : prev.filter((c) => c.id !== saved.id)));
    if (fits) return "Saved";
    if (saved.status !== "published") return "Saved as a draft. Drafts don’t show in the grid.";
    return "Saved. This card no longer matches the current filters.";
  });

  return (
    <div className="px-6 max-sm:px-0">
      <div className="max-sm:px-3">
        <SectionHeader section={section} sub={state.sub} count={status === "ready" ? items.length : null} />
        <ChipBar counts={counts} />
      </div>

      {state.q && status !== "loading" && (
        <p className="pb-4 pt-1 text-sm text-fg-2 max-sm:px-3">
          {items.length === 0 ? "No results" : `Results for “${state.q}”`}
          {state.filters.length > 0 && ` with ${state.filters.length} filter${state.filters.length > 1 ? "s" : ""}`}
        </p>
      )}

      <div className="pt-3 pb-12">
        {status === "loading" && <GridSkeleton />}

        {status === "error" && (
          <MessageState
            title="Couldn’t load this section"
            body="Check your connection and try again."
            action={
              <button type="button" onClick={retry} className="ng-btn-ghost h-10 px-5 text-xs">
                Try again
              </button>
            }
          />
        )}

        {status === "ready" && items.length === 0 && (
          <MessageState
            icon={state.q ? <SearchIcon size={48} /> : <TuneIcon size={48} />}
            title={state.q ? `Nothing matches “${state.q}”` : `No ${section.name.toLowerCase()} match these filters`}
            body={
              state.filters.length
                ? "Every selected filter group must match. Try removing a filter."
                : "Try a shorter or different word."
            }
            action={
              <div className="flex gap-2">
                {state.filters.length > 0 && (
                  <button type="button" onClick={clearFilters} className="ng-btn-ghost h-10 px-5 text-xs">
                    Clear filters
                  </button>
                )}
                {state.q && (
                  <button type="button" onClick={() => go({ q: "" })} className="ng-btn-ghost h-10 px-5 text-xs">
                    Clear search
                  </button>
                )}
              </div>
            }
          />
        )}

        {status === "ready" && items.length > 0 && (
          <div className={GRID_CLASS}>
            {items.map((c) => (
              <VideoCard key={c.id} card={c} kind={section.kind} />
            ))}
            {loadingMore && Array.from({ length: 4 }, (_, i) => <CardSkeleton key={`s${i}`} />)}
          </div>
        )}
        <div ref={sentinel} aria-hidden="true" className="h-px" />
      </div>
    </div>
  );
}
