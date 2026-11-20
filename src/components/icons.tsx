// Neal Guides HUD icon set: drawn for this app (24x24, currentColor).
// Style: angular geometry, square line caps, mitred corners, diamonds and
// chamfered frames instead of circles and rounded boxes, to match the
// gaming theme. No third-party icon set and nothing reused from RohTre.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeMiterlimit={10}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

// ------------------------------------------------------------ navigation
export const MenuIcon = (p: P) => (
  <Svg {...p}><path d="M3 6h18M3 12h12M3 18h18" /><path d="M19 11h2v2h-2z" fill="currentColor" stroke="none" /></Svg>
);
export const SearchIcon = (p: P) => (
  <Svg {...p}><path d="M10.5 3.5 16.6 7v7l-6.1 3.5L4.4 14V7z" /><path d="m15.6 15.6 5 5" /></Svg>
);
export const CloseIcon = (p: P) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const BackIcon = (p: P) => (
  <Svg {...p}><path d="M20 12H5.5M11 6l-6 6 6 6" /></Svg>
);
export const ChevronLeft = (p: P) => (
  <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>
);
export const ChevronRight = (p: P) => (
  <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>
);
export const ChevronDown = (p: P) => (
  <Svg {...p}><path d="M5 9l7 7 7-7" /></Svg>
);
export const ArrowRightIcon = (p: P) => (
  <Svg {...p}><path d="M4 12h14.5M13 6l6 6-6 6" /></Svg>
);
export const MoreIcon = (p: P) => (
  <Svg {...p}><path d="M10.5 3.5h3v3h-3zM10.5 10.5h3v3h-3zM10.5 17.5h3v3h-3z" fill="currentColor" stroke="none" /></Svg>
);

// ------------------------------------------------------------- sections
/** FC gameplay: an angular controller. */
export const GameplayIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 7h12l4 5v4l-2.5 3H16l-2-3h-4l-2 3H4.5L2 16v-4z" />
    <path d="M7.5 10v4M5.5 12h4" />
    <path d="M15.5 10h1.6v1.6h-1.6zM17.9 12.4h1.6V14h-1.6z" fill="currentColor" stroke="none" />
  </Svg>
);
/** Effects: a four-point burst with a small spark. */
export const SparkIcon = (p: P) => (
  <Svg {...p}>
    <path d="M11 3l1.9 6.1L19 11l-6.1 1.9L11 19l-1.9-6.1L3 11l6.1-1.9z" />
    <path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" />
  </Svg>
);
/** Music: a beamed note with diamond heads. */
export const MusicIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 17.5V5.5l11-2.5v12" />
    <path d="M9 9l11-2.5" />
    <path d="M6 14.5l3 3-3 3-3-3zM17 12l3 3-3 3-3-3z" fill="currentColor" stroke="none" />
  </Svg>
);
/** Backgrounds: a chamfered frame with a horizon. */
export const BackgroundIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 7l3-3h15v13l-3 3H3z" />
    <path d="M3 16l5-5 4 4 3-3 6 6" />
    <path d="M15 7.5h2.5V10H15z" fill="currentColor" stroke="none" />
  </Svg>
);
/** Stacked layers (used for image previews in the admin). */
export const LayersIcon = (p: P) => (
  <Svg {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5" /></Svg>
);
/** Subsection marker: a small diamond. */
export const DiamondIcon = (p: P) => (
  <Svg {...p}><path d="M12 5l7 7-7 7-7-7z" fill="currentColor" stroke="none" /></Svg>
);
/** Folder (generic section fallback). */
export const FolderIcon = (p: P) => (
  <Svg {...p}><path d="M3 5h6.5l2 2.5H21V19H3z" /><path d="M3 10.5h18" /></Svg>
);

// --------------------------------------------------------------- tools
export const TuneIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 7h18M3 17h18" />
    <path d="M15 4.5l2.5 2.5-2.5 2.5-2.5-2.5zM9 14.5l2.5 2.5L9 19.5 6.5 17z" fill="currentColor" stroke="none" />
  </Svg>
);
export const ShieldIcon = (p: P) => (
  <Svg {...p}><path d="M12 2.5 20 5.5v6l-2 5.5-6 4.5-6-4.5-2-5.5v-6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></Svg>
);
export const LockIcon = (p: P) => (
  <Svg {...p}><path d="M5 11h14v8l-2 2H5z" /><path d="M8 11V7l2-2.5h4L16 7v4" /><path d="M11 15h2v2h-2z" fill="currentColor" stroke="none" /></Svg>
);
export const LogoutIcon = (p: P) => (
  <Svg {...p}><path d="M14 3.5h6.5v17H14" /><path d="M10 8l-4 4 4 4M6 12h10.5" /></Svg>
);
export const MailIcon = (p: P) => (
  <Svg {...p}><path d="M3 5.5h18v13H3z" /><path d="M3 5.5l9 7 9-7" /></Svg>
);
export const EyeIcon = (p: P) => (
  <Svg {...p}><path d="M2 12l5-6h10l5 6-5 6H7z" /><path d="M12 9l3 3-3 3-3-3z" fill="currentColor" stroke="none" /></Svg>
);
export const EyeOffIcon = (p: P) => (
  <Svg {...p}><path d="M9.5 6H17l5 6-2.6 3.1M14.6 18H7l-5-6 2.6-3.1" /><path d="M3 3l18 18" /></Svg>
);
export const PencilIcon = (p: P) => (
  <Svg {...p}><path d="M4 20v-4L16 4l4 4L8 20z" /><path d="M13 7l4 4" /></Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}><path d="M4 12.5l5 5L20 6.5" /></Svg>
);

// ------------------------------------------------------------- playback
export const PlayIcon = (p: P) => (
  <Svg {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></Svg>
);
export const PauseIcon = (p: P) => (
  <Svg {...p}><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none" /></Svg>
);
export const LoopIcon = (p: P) => (
  <Svg {...p}><path d="M4 11V7h14.5M15.5 4l3 3-3 3" /><path d="M20 13v4H5.5M8.5 20l-3-3 3-3" /></Svg>
);
export const VolumeIcon = (p: P) => (
  <Svg {...p}><path d="M3.5 9h4L13 4.5v15L7.5 15h-4z" /><path d="M16.5 9v6M19.5 6.5v11" /></Svg>
);
export const VolumeOffIcon = (p: P) => (
  <Svg {...p}><path d="M3.5 9h4L13 4.5v15L7.5 15h-4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></Svg>
);

// -------------------------------------------------------- files and links
export const DownloadIcon = (p: P) => (
  <Svg {...p}><path d="M12 3.5v11M6.5 9.5l5.5 5.5 5.5-5.5" /><path d="M4 17.5v3h16v-3" /></Svg>
);
export const UploadIcon = (p: P) => (
  <Svg {...p}><path d="M12 15V4M6.5 9.5 12 4l5.5 5.5" /><path d="M4 17.5v3h16v-3" /></Svg>
);
export const ExternalIcon = (p: P) => (
  <Svg {...p}><path d="M14 3.5h6.5V10M20.5 3.5l-9 9" /><path d="M18 14v6.5H3.5V6H10" /></Svg>
);
export const LinkIcon = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 7.5 13 5h4.5L20 7.5V12l-2.5 2.5" />
    <path d="M13.5 16.5 11 19H6.5L4 16.5V12l2.5-2.5" />
    <path d="M9 15l6-6" />
  </Svg>
);

export const SECTION_ICONS = {
  gameplay: GameplayIcon,
  effect: SparkIcon,
  music: MusicIcon,
  background: BackgroundIcon,
} as const;
