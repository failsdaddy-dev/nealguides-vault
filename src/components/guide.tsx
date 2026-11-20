"use client";

// Left menu (HUD style). Full width on wide screens, icon rail on medium
// screens, slide-in drawer on small ones. Three levels, all from the database
// and managed only in Admin -> Sections:
//   Group (e.g. "Vault")  -> a button; tapping it opens its sections
//   Section (e.g. Effects) -> a page; with subsections it has its own dropdown
//   Subsection (e.g. Shorts) -> ?sub=<slug>
// No limit on how many of each. The group and section you are in open by
// themselves.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { HOME_PATH } from "@/lib/brand";
import type { Section, SidebarGroup } from "@/lib/types";
import { useCurrentSection } from "@/lib/use-browse-url";
import { ActiveFilterList, ActiveFiltersTab } from "./active-filters";
import { useHub } from "./hub-context";
import { ChevronDown, FolderIcon, MenuIcon, SECTION_ICONS, ShieldIcon } from "./icons";
import { IconButton, Wordmark } from "./top-bar";

function SectionIcon({ kind }: { kind: Section["kind"] }) {
  const Icon = SECTION_ICONS[kind] ?? FolderIcon;
  return <Icon size={18} />;
}

function SectionItem({ s, i, onNavigate }: { s: Section; i: number; onNavigate?: () => void }) {
  const current = useCurrentSection();
  const params = useSearchParams();
  const active = current === s.slug;
  const sub = active ? params.get("sub") : null;
  const subs = s.subsections ?? [];
  const [open, setOpen] = useState(active);

  // Opening a section from anywhere (link, back button) unfolds it here too.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setOpen(true);
  }

  const panelId = `subnav-${s.slug}`;
  return (
    <li style={{ "--i": i } as CSSProperties} className="ng-nav-item">
      <div className="ng-nav-row" data-active={active ? "" : undefined}>
        <Link
          href={`/${s.slug}`}
          onClick={() => {
            if (subs.length) setOpen(true);
            onNavigate?.();
          }}
          aria-current={active && !sub ? "page" : undefined}
          className="ng-nav-link"
        >
          <span className="ng-nav-icon">
            <SectionIcon kind={s.kind} />
          </span>
          <span className="min-w-0 flex-1 truncate">{s.name}</span>
        </Link>
        {subs.length > 0 && (
          <button
            type="button"
            className="ng-nav-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? "Close" : "Open"} ${s.name} subsections`}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown size={16} className="ng-nav-chevron" />
          </button>
        )}
      </div>

      {subs.length > 0 && (
        <div id={panelId} className="ng-subnav" data-open={open ? "" : undefined} inert={!open}>
          <div className="min-h-0 overflow-hidden">
            <ul className="ng-subnav-list">
              <li>
                <Link
                  href={`/${s.slug}`}
                  onClick={onNavigate}
                  aria-current={active && !sub ? "page" : undefined}
                  className="ng-subnav-link"
                >
                  All {s.name.toLowerCase()}
                </Link>
              </li>
              {subs.map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/${s.slug}?sub=${x.slug}`}
                    onClick={onNavigate}
                    aria-current={active && sub === x.slug ? "page" : undefined}
                    className="ng-subnav-link"
                  >
                    {x.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

function GroupItem({
  g,
  sections,
  index,
  onNavigate,
}: {
  g: SidebarGroup;
  sections: Section[];
  index: number;
  onNavigate?: () => void;
}) {
  const current = useCurrentSection();
  const holdsCurrent = sections.some((s) => s.slug === current);
  const [open, setOpen] = useState(holdsCurrent);

  // Navigating into one of this group's sections unfolds the group.
  const [had, setHad] = useState(holdsCurrent);
  if (had !== holdsCurrent) {
    setHad(holdsCurrent);
    if (holdsCurrent) setOpen(true);
  }

  const panelId = `group-${g.slug}`;
  return (
    <li className="ng-nav-item" style={{ "--i": index } as CSSProperties}>
      <button
        type="button"
        className="ng-group-row"
        data-current={holdsCurrent ? "" : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ng-group-mark" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{g.name}</span>
        <span className="ng-group-count">{sections.length}</span>
        <ChevronDown size={16} className="ng-nav-chevron" />
      </button>
      <div id={panelId} className="ng-subnav" data-open={open ? "" : undefined} inert={!open}>
        <div className="min-h-0 overflow-hidden">
          {sections.length ? (
            <ul className="ng-group-list">
              {sections.map((s, i) => (
                <SectionItem key={s.slug} s={s} i={i} onNavigate={onNavigate} />
              ))}
            </ul>
          ) : (
            <p className="ng-group-list py-2 pl-5 text-xs text-fg-2">No sections yet.</p>
          )}
        </div>
      </div>
    </li>
  );
}

function AdminItem({ mini, onNavigate }: { mini: boolean; onNavigate?: () => void }) {
  const { user } = useHub();
  const pathname = usePathname();
  if (user.role !== "admin") return null;
  const active = pathname === "/admin" || pathname.startsWith("/admin/");
  if (mini) {
    return (
      <Link href="/admin" aria-current={active ? "page" : undefined} className="ng-rail-link" data-active={active ? "" : undefined}>
        <span className="ng-nav-icon">
          <ShieldIcon size={18} />
        </span>
        <span className="max-w-full truncate px-1">Admin</span>
      </Link>
    );
  }
  return (
    <div className="ng-nav-row" data-active={active ? "" : undefined}>
      <Link href="/admin" onClick={onNavigate} aria-current={active ? "page" : undefined} className="ng-nav-link">
        <span className="ng-nav-icon">
          <ShieldIcon size={18} />
        </span>
        <span className="flex-1">Admin panel</span>
      </Link>
    </div>
  );
}

function FullGuideBody({ onNavigate, inline }: { onNavigate?: () => void; inline?: boolean }) {
  const { sidebarGroups, sections, user } = useHub();
  // Sections whose group is hidden or unknown don't show (the admin hid the group).
  return (
    <div className="flex flex-col px-3 pb-6 pt-5">
      <p className="ng-tag px-2 pb-3">Library</p>
      <nav aria-label="Library">
        <ul className="flex flex-col gap-2">
          {sidebarGroups.map((g, i) => (
            <GroupItem
              key={g.slug}
              g={g}
              index={i}
              sections={sections.filter((s) => s.groupSlug === g.slug)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      <p className="ng-tag mt-6 px-2 pb-3">Tools</p>
      {inline ? (
        // Touch drawer: no hover, so the list is shown in place.
        <div className="px-2">
          <p className="pb-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-fg-2">Active filters</p>
          <ActiveFilterList />
        </div>
      ) : (
        <ActiveFiltersTab mini={false} />
      )}
      {user.role === "admin" && (
        <div className="mt-1">
          <AdminItem mini={false} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}

function MiniRail() {
  const { sections } = useHub();
  const current = useCurrentSection();
  return (
    <>
      <nav aria-label="Sections" className="flex flex-col gap-1">
        {sections.map((s) => {
          const active = current === s.slug;
          return (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              aria-current={active ? "page" : undefined}
              data-active={active ? "" : undefined}
              title={s.name}
              className="ng-rail-link"
            >
              <span className="ng-nav-icon">
                <SectionIcon kind={s.kind} />
              </span>
              <span className="max-w-full truncate px-1">{s.name}</span>
            </Link>
          );
        })}
      </nav>
      <hr className="mx-2 my-2 border-line" />
      <ActiveFiltersTab mini />
      <AdminItem mini />
    </>
  );
}

export function Guide() {
  const { guideMode, drawerOpen, setDrawerOpen, toggleGuide } = useHub();
  const pathname = usePathname();

  // Close the drawer after navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  return (
    <>
      {guideMode === "full" && (
        <aside
          aria-label="Menu"
          className="ng-guide vh-fade-in fixed bottom-0 left-0 top-14 z-30 w-[var(--guide-full)] overflow-y-auto overscroll-contain"
        >
          <FullGuideBody />
        </aside>
      )}
      {guideMode === "mini" && (
        <aside
          aria-label="Menu"
          className="ng-guide vh-fade-in fixed bottom-0 left-0 top-14 z-30 flex w-[var(--guide-mini)] flex-col px-1.5 pt-3"
        >
          <MiniRail />
        </aside>
      )}

      {/* Drawer (narrow screens). Always mounted so it can animate. */}
      <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-[var(--overlay)] transition-opacity duration-[var(--dur-3)] ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          aria-label="Menu"
          inert={!drawerOpen}
          className={`ng-guide absolute inset-y-0 left-0 w-[var(--guide-full)] overflow-y-auto shadow-2xl transition-transform duration-[var(--dur-3)] ease-[var(--ease)] ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="ng-hud-line flex h-14 items-center gap-2 border-b border-line px-3">
            <IconButton label="Close menu" onClick={toggleGuide}>
              <MenuIcon />
            </IconButton>
            <Link href={HOME_PATH} className="rounded-md px-1 py-1">
              <Wordmark size={28} />
            </Link>
          </div>
          <FullGuideBody inline onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>
    </>
  );
}
