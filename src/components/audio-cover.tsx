"use client";

// Cover for audio cards (HUD style): a dark panel with a green glow placed
// from the title, grid lines, the preview's waveform, an angled Play button
// and the preview length (max 30 s).

import type { Card } from "@/lib/types";
import { formatTime } from "./audio-player";
import { MusicIcon, PlayIcon } from "./icons";
import { Waveform } from "./waveform";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function AudioCover({ card, onPlay, size = "card" }: { card: Card; onPlay: () => void; size?: "card" | "page" }) {
  const n = hash(card.title);
  const x = 15 + Math.round(n * 70);
  const mix = 16 + Math.round(n * 18);
  const big = size === "page";
  return (
    <div
      className="ng-card-ph absolute inset-0 flex flex-col justify-between p-4"
      style={{
        backgroundImage: `radial-gradient(70% 90% at ${x}% 0%, color-mix(in srgb, var(--brand) ${mix}%, transparent), transparent 70%)`,
      }}
    >
      <MusicIcon size={big ? 30 : 20} className="text-brand" />
      <div className="flex flex-1 items-center justify-center">
        {card.audioPreview ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }}
            aria-label={`Play ${card.title}`}
            className={`vh-press ng-cut grid place-items-center bg-brand text-brand-fg transition-transform duration-200 hover:scale-105 ${
              big ? "size-20 [--cut:14px]" : "size-14 [--cut:10px]"
            }`}
          >
            <PlayIcon size={big ? 34 : 26} />
          </button>
        ) : (
          <span className="ng-tag no-bar text-[10px] text-fg-2">No audio yet</span>
        )}
      </div>
      <div className="opacity-70">
        <Waveform peaks={card.audioPreview?.peaks ?? null} progress={0} height={big ? 44 : 26} bars={big ? 90 : 48} />
      </div>
      {card.audioPreview && (
        <span className="absolute bottom-2 right-2 bg-black/75 px-1.5 py-0.5 font-display text-xs font-semibold tracking-[0.06em] text-white">
          {formatTime(Math.min(card.audioPreview.duration, 30))}
        </span>
      )}
    </div>
  );
}
