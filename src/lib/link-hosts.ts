// Display names for the download-link host badges the database computes
// (card_links.host / cards.link_hosts). Labels only, never the links.
import type { LinkHost } from "./types";

export const HOST_NAME: Record<LinkHost, string> = {
  "google-drive": "Google Drive",
  mega: "Mega",
  dropbox: "Dropbox",
  wetransfer: "WeTransfer",
  other: "Other",
};

export const HOST_SHORT: Record<LinkHost, string> = {
  "google-drive": "Drive",
  mega: "Mega",
  dropbox: "Dropbox",
  wetransfer: "WeTransfer",
  other: "Web",
};

/** Badge text for one link: the known host, or the bare domain for "other". */
export function hostBadge(host: LinkHost | undefined, hostName?: string): string {
  if (!host) return "";
  if (host === "other" && hostName) return hostName.replace(/^www\./, "");
  return HOST_NAME[host];
}
