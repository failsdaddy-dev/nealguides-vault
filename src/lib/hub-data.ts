import "server-only";
// Loads what the signed-in shell needs. With Supabase, RLS decides which
// sections and filters this user may see; without it, sample data is used.

import { requireViewer } from "./auth";
import { FILTERS, FILTER_GROUPS, SECTIONS, SIDEBAR_GROUPS } from "./mock-data";
import { SUPABASE_CONFIGURED } from "./supabase/env";
import { supabaseServer } from "./supabase/server";
import type { CurrentUser, Filter, FilterGroup, Section, SidebarGroup } from "./types";

export interface HubData {
  /** Top-level side-menu buttons, in order; each opens its sections. */
  sidebarGroups: SidebarGroup[];
  sections: Section[];
  groups: FilterGroup[];
  filters: Filter[];
  user: CurrentUser;
  sampleMode: boolean;
}

const SAMPLE_USER: CurrentUser = {
  id: "sample-admin",
  email: "owner@example.com",
  displayName: "Sample Owner",
  role: "admin",
};

export async function loadHubData(): Promise<HubData> {
  if (!SUPABASE_CONFIGURED) {
    return {
      sidebarGroups: SIDEBAR_GROUPS,
      sections: SECTIONS,
      groups: FILTER_GROUPS,
      filters: FILTERS,
      user: SAMPLE_USER,
      sampleMode: true,
    };
  }
  const viewer = await requireViewer();
  const sb = await supabaseServer();
  const [sections, subsections, groups, filters, sidebar] = await Promise.all([
    sb.from("sections").select("*").eq("is_visible", true).order("sort_order").order("name"),
    sb.from("subsections").select("section_id, slug, name").eq("is_visible", true).order("sort_order").order("name"),
    sb.from("filter_groups").select("id, slug, name").order("sort_order").order("name"),
    sb.from("filters").select("id, group_id, slug, name, is_quick").order("sort_order").order("name"),
    sb.from("section_groups").select("id, slug, name").eq("is_visible", true).order("sort_order").order("name"),
  ]);
  // Until the sidebar-groups migration runs, everything sits in one "Vault" group.
  const sidebarRows = sidebar.error ? [{ id: "", slug: "vault", name: "Vault" }] : (sidebar.data ?? []);
  const groupSlugById = new Map(sidebarRows.map((g) => [g.id, g.slug]));
  return {
    sidebarGroups: sidebarRows.map((g) => ({ slug: g.slug, name: g.name })),
    sections: (sections.data ?? []).map((s) => ({
      slug: s.slug,
      name: s.name,
      kind: s.kind,
      groupSlug: sidebar.error ? "vault" : groupSlugById.get((s as { group_id?: string }).group_id ?? "") ?? "",
      subsections: (subsections.data ?? []).filter((x) => x.section_id === s.id).map((x) => ({ slug: x.slug, name: x.name })),
    })),
    groups: groups.data ?? [],
    filters: (filters.data ?? []).map((f) => ({
      id: f.id,
      groupId: f.group_id,
      slug: f.slug,
      name: f.name,
      isQuick: f.is_quick,
    })),
    user: viewer.user,
    sampleMode: false,
  };
}

export async function findSection(slug: string): Promise<Section | null> {
  if (!SUPABASE_CONFIGURED) return SECTIONS.find((s) => s.slug === slug) ?? null;
  const sb = await supabaseServer();
  const { data } = await sb
    .from("sections")
    .select("slug, name, kind, subsections(slug, name, is_visible, sort_order)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const subs = (data.subsections ?? [])
    .filter((x) => x.is_visible)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((x) => ({ slug: x.slug, name: x.name }));
  return { slug: data.slug, name: data.name, kind: data.kind, subsections: subs };
}
