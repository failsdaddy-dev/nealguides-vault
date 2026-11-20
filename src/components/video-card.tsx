"use client";

// One asset card in the grid (HUD style): framed panel with corner brackets,
// a type badge (Clip, Short, Image, Audio), the preview (looping clip, still
// image or audio cover), title, tags, host badges of its links, and the
// action buttons. Vertical clips (Shorts) are shown whole on a blurred
// backdrop instead of being cropped.

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { HOVER_INTENT_MS, PREVIEW_AUTOPLAY, PREVIEW_STAGGER_MS, previewCoordinator, usePreviewRank } from "@/lib/preview-coordinator";
import type { Card, SectionKind } from "@/lib/types";
import { cardHref } from "@/lib/url-state";
import { clipPosterUrl, imageCardUrl } from "@/lib/cloudinary-url";
import { HOST_SHORT } from "@/lib/link-hosts";
import { AudioCover } from "./audio-cover";
import { useAudio } from "./audio-player";
import { CardActions } from "./card-actions";
import { CardEditButton, EDIT_BUTTON_PLACEMENT } from "./card-edit";
import { useHub } from "./hub-context";
import { FolderIcon, LinkIcon, MoreIcon, SECTION_ICONS } from "./icons";
import { useDismiss } from "./popover";
import { ClipPreview } from "./clip-preview";
import { useToast } from "./toast";
import { VideoModal } from "./video-modal";

/** Shown when a card has no preview yet. */
function Placeholder({ title, kind }: { title: string; kind: SectionKind }) {
  const Icon = SECTION_ICONS[kind] ?? FolderIcon;
  return (
    <div className="ng-card-ph absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
      <Icon size={30} className="text-brand" />
      <span className="line-clamp-2 max-w-[85%] text-sm font-medium text-fg-2">{title}</span>
      <span className="ng-tag no-bar text-[10px] text-fg-2">No preview yet</span>
    </div>
  );
}

function typeLabel(card: Card): string {
  if (card.mediaType === "audio") return "Audio";
  if (card.mediaType === "image") return "Image";
  if (card.subsectionSlug === "shorts") return "Short";
  const c = card.previewClip;
  if (c?.width && c.height && c.height > c.width) return "Vertical";
  return "Clip";
}

function FilterTags({ slugs }: { slugs: string[] }) {
  const { filterBySlug } = useHub();
  const names = slugs.map((s) => filterBySlug.get(s)?.name).filter((n): n is string => !!n);
  if (!names.length) return null;
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return (
    <div className="group/tags relative flex flex-wrap items-center gap-1.5">
      {shown.map((n) => (
        <span key={n} className="ng-chip">
          {n}
        </span>
      ))}
      {rest > 0 && (
        <span tabIndex={0} className="ng-chip cursor-default" aria-label={`All tags: ${names.join(", ")}`}>
          +{rest}
        </span>
      )}
      {rest > 0 && (
        <div
          role="tooltip"
          className="vh-menu pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-max max-w-[260px] p-2 text-xs group-focus-within/tags:block group-hover/tags:block"
        >
          {names.join(" · ")}
        </div>
      )}
    </div>
  );
}

function HostBadges({ card }: { card: Card }) {
  const hosts = card.linkHosts ?? [];
  if (!hosts.length) return null;
  return (
    <p className="ng-tag no-bar min-w-0 gap-1.5 truncate text-[10px] text-fg-2" title="Where the files are hosted">
      <LinkIcon size={12} className="shrink-0 text-brand" />
      {hosts.map((h) => HOST_SHORT[h] ?? h).join(" · ")}
    </p>
  );
}

function CardMenu({ card }: { card: Card }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, box, close);

  const copy = async () => {
    const url = `${window.location.origin}${cardHref(card)}`;
    setOpen(false);
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast(url);
    }
  };

  return (
    <div ref={box} className="relative -mr-1 shrink-0">
      <button
        type="button"
        aria-label={`More actions for ${card.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-[3px] text-fg-2 opacity-0 transition-colors hover:bg-hover hover:text-brand focus-visible:opacity-100 group-hover:opacity-100 aria-expanded:opacity-100 max-sm:opacity-100"
      >
        <MoreIcon size={18} />
      </button>
      {open && (
        <div role="menu" className="vh-pop-in absolute right-0 top-9 z-30 w-48 origin-top-right vh-menu">
          <button type="button" role="menuitem" onClick={copy} className="vh-menu-item flex w-full items-center gap-3 text-sm">
            <LinkIcon size={18} /> Copy card link
          </button>
        </div>
      )}
    </div>
  );
}

export const VideoCard = memo(function VideoCard({ card, kind }: { card: Card; kind: SectionKind }) {
  const audio = card.mediaType === "audio";
  const image = card.mediaType === "image" ? card.previewImage ?? null : null;
  const rank = usePreviewRank(card.id);
  const clip = audio || card.mediaType === "image" ? null : card.previewClip;
  const vertical = !!clip?.width && !!clip.height && clip.height > clip.width;
  const active = !!clip && rank >= 0;
  const root = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modal, setModal] = useState(false);
  const pushed = useRef(false);
  const { playCard } = useAudio();
  const href = cardHref(card);

  // Watch the card so the coordinator can give it a preview slot while it's on screen.
  useEffect(() => {
    if (!clip || !root.current) return;
    return previewCoordinator.register(card.id, root.current);
  }, [clip, card.id]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      previewCoordinator.release(card.id);
    },
    [card.id],
  );

  // Back button closes the modal it opened.
  useEffect(() => {
    if (!modal) return;
    const onPop = () => {
      pushed.current = false;
      setModal(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [modal]);

  // Hover preview only when autoplay is switched off (see preview-coordinator).
  const enter = () => {
    if (PREVIEW_AUTOPLAY || !clip) return;
    timer.current = setTimeout(() => previewCoordinator.setHovered(card.id), HOVER_INTENT_MS);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    previewCoordinator.release(card.id);
  };

  const openModal = (e: React.MouseEvent) => {
    // New tab / window keeps working as a normal link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!clip) return; // image and placeholder cards open the card page
    e.preventDefault();
    setModal(true);
    window.history.pushState({ vhModal: card.id }, "", href);
    pushed.current = true;
  };
  const closeModal = () => {
    setModal(false);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  };

  // Admin-only Edit (renders nothing for editors), a sibling of the card's
  // links, never inside them. See EDIT_BUTTON_PLACEMENT in card-edit.tsx.
  const cornerEdit =
    EDIT_BUTTON_PLACEMENT === "thumbnail-corner" ? <CardEditButton card={card} look="overlay" className="absolute right-2 top-2 z-10" /> : null;

  const badge = <span className="ng-card-type">{typeLabel(card)}</span>;

  const media = audio ? (
    <div className="ng-card-media">
      <AudioCover card={card} onPlay={() => playCard(card, kind)} />
      {badge}
      {cornerEdit}
    </div>
  ) : (
    <div className="relative">
      <Link href={href} aria-label={card.title} onClick={openModal} onFocus={enter} onBlur={leave} className="ng-card-media block">
        {image ? (
          <Image src={imageCardUrl(image.url)} alt="" fill sizes="(max-width: 640px) 100vw, 400px" className="object-cover" loading="lazy" />
        ) : clip ? (
          <>
            {vertical && (
              // Blurred fill behind a vertical clip, so the whole frame shows.
              <Image src={clipPosterUrl(clip.url)} alt="" fill sizes="400px" className="scale-110 object-cover opacity-45 blur-xl" loading="lazy" />
            )}
            <Image
              // The clip's first frame; the loop fades in over it.
              src={clipPosterUrl(clip.url)}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className={vertical ? "object-contain" : "object-cover"}
              loading="lazy"
            />
            <ClipPreview url={clip.url} active={active} fit={vertical ? "contain" : "cover"} delayMs={Math.max(0, rank) * PREVIEW_STAGGER_MS} />
          </>
        ) : (
          <Placeholder title={card.title} kind={kind} />
        )}
        <span aria-hidden="true" className="ng-card-scan" />
      </Link>
      {badge}
      {cornerEdit}
    </div>
  );

  return (
    <article
      ref={root}
      className="ng-panel is-interactive ng-card group flex min-w-0 flex-col"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      {media}

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h3 className="line-clamp-2 font-display text-[17px] font-semibold leading-[1.2] tracking-[0.01em]">
              <Link href={href} className="transition-colors hover:text-brand">
                {card.title}
              </Link>
            </h3>
            <FilterTags slugs={card.filterSlugs} />
          </div>
          {!cornerEdit && <CardEditButton card={card} className="-mt-1" />}
          <CardMenu card={card} />
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <HostBadges card={card} />
          <CardActions card={card} kind={kind} />
        </div>
      </div>

      {clip && <VideoModal card={card} kind={kind} open={modal} onClose={closeModal} />}
    </article>
  );
});
