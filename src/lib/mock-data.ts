// Sample content for `next dev` without Supabase (sample mode). These are
// neutral placeholders, not real Neal Guides assets. Production never shows
// them: the proxy refuses to serve without Supabase settings.

import type { Card, Filter, FilterGroup, LinkLabel, Section } from "./types";

export const SECTIONS: Section[] = [
  { slug: "fc-gameplay-clips", name: "FC Gameplay Clips", kind: "gameplay" },
  { slug: "effects", name: "Effects", kind: "effect" },
  { slug: "music", name: "Music", kind: "music" },
  { slug: "backgrounds", name: "Backgrounds", kind: "background" },
];

export const FILTER_GROUPS: FilterGroup[] = [
  { id: "g-sample-a", slug: "sample-group-a", name: "Sample group A" },
  { id: "g-sample-b", slug: "sample-group-b", name: "Sample group B" },
];

const base: Array<[string, string, string, boolean]> = [
  ["g-sample-a", "sample-tag-1", "Sample tag 1", true],
  ["g-sample-a", "sample-tag-2", "Sample tag 2", true],
  ["g-sample-a", "sample-tag-3", "Sample tag 3", true],
  ["g-sample-b", "sample-tag-4", "Sample tag 4", true],
  ["g-sample-b", "sample-tag-5", "Sample tag 5", false],
];

export const FILTERS: Filter[] = base.map(([groupId, slug, name, isQuick]) => ({
  id: `f-${slug}`,
  groupId,
  slug,
  name,
  isQuick,
}));

type Seed = [section: string, title: string, filters: string[], opts?: Partial<Card>];

const TAGS = ["sample-tag-1", "sample-tag-2", "sample-tag-3", "sample-tag-4", "sample-tag-5"];
const seeds: Seed[] = SECTIONS.flatMap((sec) =>
  Array.from({ length: sec.kind === "music" ? 6 : 10 }, (_, i): Seed => [
    sec.slug,
    `Sample ${sec.name.toLowerCase()} ${i + 1}`,
    [TAGS[i % TAGS.length]!, TAGS[(i + 2) % TAGS.length]!],
  ]),
);

const descriptions: Record<string, string> = {
  gameplay: "Sample card (development only).",
  effect: "Sample card (development only).",
  music: "Sample card (development only).",
  background: "Sample card (development only).",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const start = Date.parse("2026-10-09T12:00:00Z");

// Sample mode: video cards loop Cloudinary's public demo clip; audio cards
// play a short tone generated in the browser.
export const SAMPLE_TONE_SECONDS = 12;
const SAMPLE_CLIP = {
  url: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
  public_id: "nealguides-vault/previews/sample",
  version: 1,
  format: "mp4",
  bytes: 1_500_000,
  duration: 10,
};
const SAMPLE_AUDIO = {
  url: "https://res.cloudinary.com/demo/video/upload/sample.mp3",
  version: 1,
  format: "mp3",
  bytes: 600_000,
  duration: SAMPLE_TONE_SECONDS,
};

function samplePeaks(seed: number): number[] {
  return Array.from({ length: 120 }, (_, k) => 0.25 + 0.7 * Math.abs(Math.sin((k + seed * 7) * 0.21) * Math.cos(k * 0.047)));
}

const toneCache = new Map<string, string>();

/** A WAV tone (two notes per card) as a blob URL, built in the browser. */
export function sampleToneUrl(cardId: string): string {
  const hit = toneCache.get(cardId);
  if (hit) return hit;
  const rate = 22050;
  const n = rate * SAMPLE_TONE_SECONDS;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  const base = 220 + (parseInt(cardId.replace(/\D/g, ""), 10) % 8) * 30;
  for (let k = 0; k < n; k++) {
    const t = k / rate;
    const f = Math.floor(t * 2) % 2 ? base * 1.5 : base;
    const env = Math.min(1, (t % 0.5) * 20) * Math.exp(-(t % 0.5) * 4);
    v.setInt16(44 + k * 2, Math.sin(2 * Math.PI * f * t) * env * 9000, true);
  }
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  toneCache.set(cardId, url);
  return url;
}

export const CARDS: Card[] = seeds.map(([section, title, filters, opts], i) => {
  const kind = SECTIONS.find((s) => s.slug === section)!.kind;
  const audio = kind === "music";
  return {
    id: `c-${String(i + 1).padStart(3, "0")}`,
    sectionSlug: section,
    slug: slugify(title),
    title,
    description: descriptions[kind],
    mediaType: audio ? "audio" : "youtube",
    // Some tutorials are "not recorded yet" so their buttons show greyed out.
    loomUrl: i % 4 === 3 ? null : "https://www.loom.com/share/0000000000000000000000000000demo",
    sourceUrl: null,
    hasProjectFiles: kind !== "music" && i % 5 !== 4,
    hasDownloads: i % 6 !== 5,
    // Sample clips come from Cloudinary's public demo account.
    previewClip: !audio && i % 3 !== 2 ? SAMPLE_CLIP : null,
    audioPreview:
      audio && i % 5 !== 4
        ? { ...SAMPLE_AUDIO, public_id: `nealguides-vault/music/sample-${i}`, peaks: samplePeaks(i) }
        : null,
    filterSlugs: [...filters].sort(),
    publishedAt: new Date(start - i * 7.5 * 3600_000).toISOString(),
    ...opts,
  };
});

export function mockLinkLabels(card: Card): LinkLabel[] {
  const out: LinkLabel[] = [];
  if (card.hasProjectFiles) out.push({ id: `${card.id}-p1`, kind: "project", label: "Project file" });
  if (card.hasDownloads) {
    const section = SECTIONS.find((s) => s.slug === card.sectionSlug)!;
    out.push({ id: `${card.id}-d1`, kind: "download", label: section.kind === "music" ? "Audio" : "Video" });
  }
  return out;
}
