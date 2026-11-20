// UI-facing shapes. Mirrors the database (src/lib/database.types.ts) but never
// carries download URLs: link rows hold labels and host badges only.

export type SectionKind = "gameplay" | "effect" | "music" | "background";
export type LinkKind = "project" | "download";
/** "youtube" is the database name for video cards (a Cloudinary preview clip);
 *  "image" cards show a still preview. */
export type MediaType = "youtube" | "audio" | "image";
/** Host badge of a download link, worked out by the database from its address. */
export type LinkHost = "google-drive" | "mega" | "dropbox" | "wetransfer" | "other";

/** A preview file on Cloudinary (public, unguessable name). The real file
 *  stays on its own host (Google Drive, Mega, ...). */
export interface PreviewFile {
  url: string;
  public_id: string;
  version: number;
  format: string;
  bytes: number;
  duration: number;
}
export interface PreviewClip extends PreviewFile {
  width?: number;
  height?: number;
}
export interface AudioPreview extends PreviewFile {
  /** Waveform bar heights 0..1, made at upload. */
  peaks?: number[] | null;
}
/** Still image preview (JPG/PNG/WebP up to 1 MB). */
export interface PreviewImage {
  url: string;
  public_id: string;
  version: number;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}
export type SortMode = "newest" | "manual" | "relevance";

export interface Subsection {
  slug: string;
  name: string;
}

export interface Section {
  slug: string;
  name: string;
  kind: SectionKind;
  subsections?: Subsection[];
  /** The sidebar group this section sits in (e.g. "vault"). */
  groupSlug?: string;
}

/** Top-level button in the side menu (e.g. "Vault"); opens its sections. */
export interface SidebarGroup {
  slug: string;
  name: string;
}

export interface FilterGroup {
  id: string;
  slug: string;
  name: string;
}

export interface Filter {
  id: string;
  groupId: string;
  slug: string;
  name: string;
  isQuick: boolean;
}

export interface LinkLabel {
  id: string;
  kind: LinkKind;
  label: string;
  host?: LinkHost;
  hostName?: string;
}

export interface Card {
  id: string;
  sectionSlug: string;
  subsectionSlug?: string | null;
  slug: string;
  title: string;
  description: string;
  mediaType: MediaType;
  loomUrl: string | null;
  sourceUrl: string | null;
  hasProjectFiles: boolean;
  hasDownloads: boolean;
  /** Video cards: short silent clip on Cloudinary that loops on the card. */
  previewClip: PreviewClip | null;
  /** Audio cards: 30-second MP3 preview on Cloudinary. */
  audioPreview: AudioPreview | null;
  /** Image cards: still preview on Cloudinary. */
  previewImage?: PreviewImage | null;
  /** Host badges of the card's links (no URLs). */
  linkHosts?: LinkHost[];
  filterSlugs: string[];
  publishedAt: string;
}

export interface BrowseQuery {
  section: string;
  sub?: string;
  filters: string[];
  q: string;
  sort: SortMode;
}

export interface Cursor {
  ts: string;
  num: number;
  id: string;
}

export interface BrowsePage {
  items: Card[];
  next: Cursor | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "editor";
}
