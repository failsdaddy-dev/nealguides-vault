"use client";

// Shareable card page (HUD style), e.g. /effects/<card-slug>: framed media
// (clip, still image or audio cover), breadcrumb, actions, the card's files
// with their host badges (labels only; the address is fetched on click),
// tags, "How to use" and share.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDataSource } from "@/lib/data-source";
import type { Card, LinkLabel, Section, SectionKind } from "@/lib/types";
import { clipLargeUrl, imageLargeUrl } from "@/lib/cloudinary-url";
import { hostBadge } from "@/lib/link-hosts";
import { buildHref, cardHref } from "@/lib/url-state";
import { AudioCover } from "./audio-cover";
import { useAudio } from "./audio-player";
import { CardActions } from "./card-actions";
import { CardEditButton, useCardSaved } from "./card-edit";
import { useHub } from "./hub-context";
import { CheckIcon, DownloadIcon, FolderIcon, LinkIcon, SECTION_ICONS } from "./icons";
import { MessageState, PillLink } from "./states";
import { TITLE_SUFFIX } from "@/lib/brand";

type State = { status: "loading" } | { status: "missing" } | { status: "ready"; card: Card };

/** The card's main media: the preview clip (bigger), the still image, or the
 *  audio cover whose Play button opens the site's audio player. */
function CardMedia({ card, kind }: { card: Card; kind: SectionKind }) {
  const { playCard } = useAudio();
  const Icon = SECTION_ICONS[kind] ?? FolderIcon;
  return (
    <div className="ng-panel ng-corners-4">
      <div className="relative aspect-video overflow-hidden bg-[#07060f]">
        {card.mediaType === "audio" ? (
          <AudioCover card={card} size="page" onPlay={() => playCard(card, kind)} />
        ) : card.mediaType === "image" && card.previewImage ? (
          <Image src={imageLargeUrl(card.previewImage.url)} alt={`Preview: ${card.title}`} fill sizes="(max-width: 1024px) 100vw, 960px" className="object-contain" />
        ) : card.previewClip ? (
          <video
            src={clipLargeUrl(card.previewClip.url)}
            muted
            loop
            autoPlay
            playsInline
            aria-label={`Preview: ${card.title}`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="ng-card-ph absolute inset-0 grid place-items-center text-fg-2">
            <div className="flex flex-col items-center gap-2">
              <Icon size={40} className="text-brand" />
              <span className="ng-tag no-bar text-fg-2">No preview added yet</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CopyLinkButton({ card }: { card: Card }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? cardHref(card) : `${window.location.origin}${cardHref(card)}`;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            (document.getElementById("vh-share-url") as HTMLInputElement | null)?.select();
          }
        }}
        className="ng-btn-ghost h-10 px-4 text-xs"
      >
        {copied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
        {copied ? "Link copied" : "Copy card link"}
      </button>
      <input
        id="vh-share-url"
        readOnly
        value={url}
        aria-label="Link to this card"
        onFocus={(e) => e.currentTarget.select()}
        className="vh-field h-9 w-full rounded-sm border border-line bg-transparent px-3 text-xs text-fg-2 outline-none"
      />
    </div>
  );
}

/** The card's files: label and host badge per link (no addresses). */
function FileList({ cardId }: { cardId: string }) {
  const [links, setLinks] = useState<LinkLabel[] | null>(null);
  useEffect(() => {
    let live = true;
    getDataSource()
      .linkLabels(cardId)
      .then((l) => live && setLinks(l))
      .catch(() => live && setLinks([]));
    return () => {
      live = false;
    };
  }, [cardId]);
  if (!links || links.length === 0) return null;
  return (
    <section className="ng-panel p-4">
      <h2 className="ng-tag mb-3">Files · {links.length}</h2>
      <ul className="divide-y divide-line">
        {links.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
            {l.kind === "project" ? <FolderIcon size={16} className="shrink-0 text-brand" /> : <DownloadIcon size={16} className="shrink-0 text-brand" />}
            <span className="min-w-0 flex-1 truncate">{l.label}</span>
            {l.host && <span className="ng-chip">{hostBadge(l.host, l.hostName)}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-2">Use the buttons above to open a file. Every open is recorded.</p>
    </section>
  );
}

export function CardPageView({ section, slug }: { section: Section; slug: string }) {
  const { filterBySlug, groups } = useHub();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const router = useRouter();

  // Admin saved this card from the Edit drawer: show the new version, or
  // follow it to its new address if the section or link name changed.
  useCardSaved((saved) => {
    if (state.status !== "ready" || saved.id !== state.card.id) return;
    if (saved.sectionSlug !== section.slug || saved.slug !== slug) {
      router.replace(`/${saved.sectionSlug}/${saved.slug}`);
    } else {
      setReload((n) => n + 1);
    }
  });

  useEffect(() => {
    let live = true;
    getDataSource()
      .card(section.slug, slug)
      .then((card) => live && setState(card ? { status: "ready", card } : { status: "missing" }))
      .catch(() => live && setState({ status: "missing" }));
    return () => {
      live = false;
    };
  }, [section.slug, slug, reload]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 max-sm:px-3 lg:grid-cols-[minmax(0,1fr)_400px]" aria-label="Loading" role="status">
        <div className="vh-skeleton aspect-video" />
        <div className="flex flex-col gap-3">
          <div className="vh-skeleton h-7 w-3/4 rounded-sm" />
          <div className="vh-skeleton h-4 w-1/2 rounded-sm" />
          <div className="vh-skeleton h-11 rounded-sm" />
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <MessageState
        title="This card isn’t available"
        body="It may have been removed, or it’s outside the tags your account can see."
        action={<PillLink href={`/${section.slug}`}>Back to {section.name}</PillLink>}
      />
    );
  }

  const { card } = state;
  const Icon = SECTION_ICONS[section.kind] ?? FolderIcon;
  const sub = section.subsections?.find((x) => x.slug === card.subsectionSlug);
  const filters = card.filterSlugs.map((s) => filterBySlug.get(s)).filter((f) => f !== undefined);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 max-sm:px-3 lg:grid-cols-[minmax(0,1fr)_400px]">
      <title>{`${card.title}${TITLE_SUFFIX}`}</title>
      <div className="flex min-w-0 flex-col gap-4">
        <nav aria-label="Breadcrumb" className="ng-tag no-bar flex-wrap gap-2 text-fg-2">
          <span>Vault</span>
          <span aria-hidden="true">/</span>
          <Link href={`/${section.slug}`} className="inline-flex items-center gap-1.5 hover:text-brand">
            <Icon size={14} /> {section.name}
          </Link>
          {sub && (
            <>
              <span aria-hidden="true">/</span>
              <Link href={buildHref(section.slug, { sub: sub.slug })} className="hover:text-brand">
                {sub.name}
              </Link>
            </>
          )}
        </nav>
        <CardMedia card={card} kind={section.kind} />
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:pt-8">
        <div className="flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[clamp(1.5rem,2.6vw,2rem)] font-bold uppercase leading-[1.05] tracking-[0.01em] [text-wrap:balance]">
            {card.title}
          </h1>
          <CardEditButton card={card} look="header" className="mt-0.5" />
        </div>

        <CardActions card={card} kind={section.kind} size="page" />

        <FileList cardId={card.id} />

        {filters.length > 0 && (
          <section>
            <h2 className="ng-tag mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Link
                  key={f.slug}
                  href={buildHref(section.slug, { filters: [f.slug] })}
                  title={`All ${section.name.toLowerCase()} with ${f.name}`}
                  className="ng-filter vh-press"
                >
                  {f.name}
                  <span className="text-[11px] font-normal text-fg-2">· {groups.find((g) => g.id === f.groupId)?.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {card.description && (
          <section className="ng-panel p-4">
            <h2 className="ng-tag mb-2">How to use</h2>
            <p className="whitespace-pre-line text-sm leading-6 text-fg-2">{card.description}</p>
          </section>
        )}

        <section>
          <h2 className="ng-tag mb-3">Share with an editor</h2>
          <CopyLinkButton card={card} />
        </section>
      </div>
    </div>
  );
}
