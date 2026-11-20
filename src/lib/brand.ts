// One place for the product name, the default landing section and brand
// files, so renaming never means hunting through components.

export const APP_NAME = "Neal Guide";
/** Shown in the browser tab: "<page> · Neal Guide". */
export const TITLE_SUFFIX = ` · ${APP_NAME}`;

/** Where signed-in visitors land, and the fallback for ?next=. */
export const DEFAULT_SECTION = "fc-gameplay-clips";
export const HOME_PATH = `/${DEFAULT_SECTION}`;

/** Official NealGuides logo files, downloaded from nealguides.com (black on
 *  transparent; shown white on the dark theme with .ng-logo-light). */
export const LOGO_SRC = "/brand/NealGuides-logo-transparent-1.png";
export const FAVICON_32 = "/brand/cropped-logo-nealguides-32x32.png";
export const FAVICON_192 = "/brand/cropped-logo-nealguides-192x192.png";
export const APPLE_ICON = "/brand/cropped-logo-nealguides-180x180.png";
