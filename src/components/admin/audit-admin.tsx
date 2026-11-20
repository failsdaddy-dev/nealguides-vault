"use client";

// Audit log (R17): who did what, when. Logins come from a database trigger;
// link opens and refusals from get-asset-link; user changes from the admin
// functions; content changes (create, delete, publish) from database
// triggers. Read-only, admin-only.

import { useEffect, useMemo, useState } from "react";
import { listAudit, listCards, type AuditRow } from "@/lib/admin-api";
import { AdminFrame, Badge, ErrorNote, Select, TABLE } from "./ui";

const ACTIONS: { value: string; label: string }[] = [
  { value: "", label: "Everything" },
  { value: "login", label: "Sign-ins" },
  { value: "open_link", label: "Link opens (downloads)" },
  { value: "open_link_denied", label: "Refused link opens" },
  { value: "admin_create_user", label: "Users created" },
  { value: "admin_disable", label: "Users disabled" },
  { value: "admin_delete", label: "Users deleted" },
  { value: "admin_set_access", label: "Access changed" },
  { value: "admin_reset_password", label: "Passwords reset" },
  { value: "admin_cards_create", label: "Cards created" },
  { value: "admin_cards_publish", label: "Cards published" },
  { value: "admin_cards_unpublish", label: "Cards unpublished" },
  { value: "admin_cards_delete", label: "Cards deleted" },
  { value: "admin_section_groups_create", label: "Sidebar groups created" },
  { value: "admin_section_groups_delete", label: "Sidebar groups deleted" },
  { value: "admin_sections_create", label: "Sections created" },
  { value: "admin_sections_delete", label: "Sections deleted" },
  { value: "admin_subsections_create", label: "Subsections created" },
  { value: "admin_subsections_delete", label: "Subsections deleted" },
  { value: "preview_deleted", label: "Preview files deleted" },
];

const CONTENT_ACTION = /^admin_(cards|section_groups|sections|subsections|filter_groups|filters)_(create|delete|publish|unpublish)$/;
const NOUN: Record<string, string> = {
  cards: "card",
  section_groups: "sidebar group",
  sections: "section",
  subsections: "subsection",
  filter_groups: "tag group",
  filters: "tag",
};
const VERB: Record<string, string> = { create: "Created", delete: "Deleted", publish: "Published", unpublish: "Unpublished" };

function describe(a: AuditRow, cardTitle: (id: string | null) => string | undefined): string {
  const d = (a.details ?? {}) as Record<string, unknown>;
  switch (a.action) {
    case "login":
      return "Signed in";
    case "open_link":
      return `Opened “${d.label ?? "link"}”${d.host ? ` (${d.host})` : ""} on ${cardTitle(a.card_id) ?? "a card"}`;
    case "open_link_denied":
      return "Tried to open a link without access";
    default: {
      const m = CONTENT_ACTION.exec(a.action);
      if (m) return `${VERB[m[2]]} ${NOUN[m[1]]} “${String(d.name ?? d.slug ?? "")}”`;
      return [a.action.replace(/^admin_/, "").replace(/_/g, " "), d.email ? `· ${d.email}` : ""].join(" ");
    }
  }
}

export function AuditAdmin() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [action, setAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCards()
      .then((cards) => setTitles(new Map(cards.map((c) => [c.id, c.title]))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    listAudit(action || null, 300)
      .then((r) => live && setRows(r))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [action]);

  const cardTitle = useMemo(() => (id: string | null) => (id ? titles.get(id) : undefined), [titles]);

  return (
    <AdminFrame
      title="Audit log"
      actions={
        <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Show" className="w-64">
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      }
    >
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="mb-3 text-sm text-fg-2">Latest 300 entries.</p>
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap tabular-nums">{new Date(a.created_at).toLocaleString()}</td>
                <td>{a.actor_email ?? "—"}</td>
                <td>
                  {a.action === "open_link_denied" && <Badge tone="red">Refused</Badge>} {describe(a, cardTitle)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error && <p className="py-12 text-center text-fg-2">Nothing logged yet.</p>}
      </div>
    </AdminFrame>
  );
}
