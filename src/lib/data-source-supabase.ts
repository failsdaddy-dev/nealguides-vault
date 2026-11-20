"use client";

// Real data. Every read runs as the signed-in user, so RLS decides what comes
// back. Download URLs are never selected: card_links.url isn't even granted.
// Link rows carry only labels and host badges.

import { parseAudioPreview, parsePreviewClip, parsePreviewImage } from "./cloudinary-url";
import type { DataSource } from "./data-source";
import { supabaseBrowser } from "./supabase/client";
import type { Card, LinkHost } from "./types";

type CardRow = {
  id: string;
  section_slug: string;
  subsection_slug?: string | null;
  slug: string;
  title: string;
  description: string;
  media_type: "youtube" | "audio" | "image";
  loom_url: string | null;
  source_url: string | null;
  has_project_files: boolean;
  has_downloads: boolean;
  preview_clip: unknown;
  audio_preview: unknown;
  preview_image?: unknown;
  link_hosts?: string[] | null;
  filter_slugs: string[];
  sort_ts: string;
};

function toCard(r: CardRow): Card {
  return {
    id: r.id,
    sectionSlug: r.section_slug,
    subsectionSlug: r.subsection_slug ?? null,
    slug: r.slug,
    title: r.title,
    description: r.description,
    mediaType: r.media_type ?? "youtube",
    loomUrl: r.loom_url,
    sourceUrl: r.source_url,
    hasProjectFiles: r.has_project_files,
    hasDownloads: r.has_downloads,
    previewClip: parsePreviewClip(r.preview_clip),
    audioPreview: parseAudioPreview(r.audio_preview),
    previewImage: parsePreviewImage(r.preview_image),
    linkHosts: (r.link_hosts ?? []) as LinkHost[],
    filterSlugs: r.filter_slugs ?? [],
    publishedAt: r.sort_ts,
  };
}

let slugById: Map<string, string> | null = null;
async function filterSlugs(): Promise<Map<string, string>> {
  if (slugById) return slugById;
  const { data, error } = await supabaseBrowser().from("filters").select("id, slug");
  if (error) throw error;
  slugById = new Map((data ?? []).map((f) => [f.id, f.slug]));
  return slugById;
}

export const supabaseSource: DataSource = {
  linksConnected: true,

  async sections() {
    const { data, error } = await supabaseBrowser().from("sections").select("slug, name, kind").order("sort_order");
    if (error) throw error;
    return data ?? [];
  },

  async filters() {
    const sb = supabaseBrowser();
    const [g, f] = await Promise.all([
      sb.from("filter_groups").select("id, slug, name").order("sort_order"),
      sb.from("filters").select("id, group_id, slug, name, is_quick").order("sort_order"),
    ]);
    if (g.error) throw g.error;
    if (f.error) throw f.error;
    return {
      groups: g.data ?? [],
      filters: (f.data ?? []).map((x) => ({ id: x.id, groupId: x.group_id, slug: x.slug, name: x.name, isQuick: x.is_quick })),
    };
  },

  async filterCounts(section, sub) {
    const [map, res] = await Promise.all([
      filterSlugs(),
      supabaseBrowser().rpc("filter_counts", { p_section: section, p_sub: sub || undefined }),
    ]);
    if (res.error) throw res.error;
    const out: Record<string, number> = {};
    for (const row of res.data ?? []) {
      const slug = map.get(row.filter_id);
      if (slug) out[slug] = Number(row.card_count);
    }
    return out;
  },

  async browse(query, after) {
    const { data, error } = await supabaseBrowser().rpc("browse_cards", {
      p_section: query.section,
      p_sub: query.sub || undefined,
      p_filters: query.filters,
      p_q: query.q || undefined,
      p_sort: query.sort,
      p_after_ts: after?.ts,
      p_after_num: after?.num,
      p_after_id: after?.id,
      p_limit: 24,
    });
    if (error) throw error;
    const rows = (data ?? []) as unknown as (CardRow & { sort_num: number })[];
    const last = rows.at(-1);
    return {
      items: rows.map(toCard),
      next: rows.length === 24 && last ? { ts: last.sort_ts, num: last.sort_num, id: last.id } : null,
    };
  },

  async card(section, slug) {
    const { data, error } = await supabaseBrowser()
      .from("cards")
      .select(
        "id, slug, title, description, media_type, loom_url, source_url, has_project_files, has_downloads, link_hosts, preview_clip, audio_preview, preview_image, published_at, created_at, sections!inner(slug), subsections(slug), card_filters(filters(slug))",
      )
      .eq("sections.slug", section)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const filters = (data.card_filters ?? [])
      .map((cf) => (cf.filters as { slug: string } | null)?.slug)
      .filter((s): s is string => !!s)
      .sort();
    return toCard({
      ...data,
      section_slug: section,
      subsection_slug: (data.subsections as { slug: string } | null)?.slug ?? null,
      filter_slugs: filters,
      sort_ts: data.published_at ?? data.created_at,
    });
  },

  async linkLabels(cardId) {
    const { data, error } = await supabaseBrowser()
      .from("card_links")
      .select("id, kind, label, host, host_name, sort_order")
      .eq("card_id", cardId)
      .order("kind")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((l) => ({ id: l.id, kind: l.kind, label: l.label, host: l.host as LinkHost, hostName: l.host_name }));
  },

  async openLink(linkId) {
    const { data, error } = await supabaseBrowser().functions.invoke<{ url?: string }>("get-asset-link", {
      body: { link_id: linkId },
    });
    if (error || !data?.url) throw error ?? new Error("No link");
    return data.url;
  },

  audioSrc(card) {
    return card.audioPreview?.url ?? null;
  },
};
