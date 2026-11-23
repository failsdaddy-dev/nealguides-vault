"use client";

// Clicking a video card: its preview clip, bigger, inside a dialog, with the
// card's buttons, description and link underneath. The address bar shows the
// card's page (/section/slug) while it is open, so the link can be copied or
// the page reloaded; Back or Esc closes it. Card previews and audio pause
// while it is open.

import { useEffect } from "react";
import type { Card, SectionKind } from "@/lib/types";
import { pauseAudio } from "./audio-player";
import { CardActions } from "./card-actions";
import { CardEditButton } from "./card-edit";
import { CopyLinkButton } from "./card-page-view";
import { useHub } from "./hub-context";
import { Modal } from "./modal";
import { clipLargeUrl } from "@/lib/cloudinary-url";
import { previewCoordinator } from "@/lib/preview-coordinator";

export function VideoModal({ card, kind, open, onClose }: { card: Card; kind: SectionKind; open: boolean; onClose: () => void }) {
  const { filterBySlug } = useHub();

  useEffect(() => {
    if (!open) return;
    previewCoordinator.setPaused("modal", true);
    pauseAudio();
    return () => previewCoordinator.setPaused("modal", false);
  }, [open]);

  const names = card.filterSlugs.map((s) => filterBySlug.get(s)?.name).filter((n): n is string => !!n);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={card.title}
      tag="Clip preview"
      wide
      // Admins: Edit closes this popup first, so only the drawer is open.
      headerActions={<CardEditButton card={card} look="header" beforeEdit={onClose} />}
    >
      {open && card.previewClip && (
        <div className="ng-screen">
          <video
            src={clipLargeUrl(card.previewClip.url)}
            muted
            loop
            autoPlay
            playsInline
            aria-label={`Preview: ${card.title}`}
            className="aspect-video max-h-[62vh] w-full object-contain"
          />
          <span className="ng-screen-readout" aria-hidden="true">
            <span className="ng-dot" />
            Preview · Loop
          </span>
        </div>
      )}
      <div className="flex flex-col gap-4 p-5">
        {names.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {names.map((n) => (
              <span key={n} className="ng-chip">
                {n}
              </span>
            ))}
          </div>
        )}
        <CardActions card={card} kind={kind} size="page" />
        {card.description && (
          <div className="border-l-2 border-[color-mix(in_srgb,var(--green)_55%,transparent)] pl-3">
            <p className="ng-tag no-bar mb-1.5 text-fg-2">Details</p>
            <p className="whitespace-pre-line text-sm leading-6 text-fg-2">{card.description}</p>
          </div>
        )}
        <CopyLinkButton card={card} />
      </div>
    </Modal>
  );
}
