"use client";

// The side menu, all editable here (admin only; the database refuses
// anyone else):
//   Sidebar groups (top-level buttons, e.g. Vault)   -> sidebar-groups-admin.tsx
//   Sections: add, edit (name, link, type, group), reorder, show/hide, delete
//   Subsections inside each section                  -> subsections-admin.tsx

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  createSection,
  deleteSection,
  listSidebarGroups,
  loadTaxonomy,
  reorder,
  slugify,
  updateSection,
  type SectionRow,
  type SidebarGroupRow,
  type SubsectionRow,
} from "@/lib/admin-api";
import type { SectionKind } from "@/lib/types";
import { useToast } from "../toast";
import { SidebarGroupsAdmin } from "./sidebar-groups-admin";
import { SubsectionsAdmin } from "./subsections-admin";
import { AdminFrame, Button, ConfirmButton, ErrorNote, Input, Panel, Select, Switch, TABLE } from "./ui";

// The type only sets the card buttons, default preview and icon; the name
// is free, so any kind of section can be made (e.g. Tweet videos, Reels).
const KINDS: { value: SectionKind; label: string }[] = [
  { value: "gameplay", label: "Video clips (gameplay, Shorts, Reels... · Project files + Download)" },
  { value: "effect", label: "Effects and overlays (Project files + Download)" },
  { value: "music", label: "Music and audio (Open on platform + Download audio)" },
  { value: "background", label: "Backgrounds and stills (Project files + Download)" },
];

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface Draft {
  id: string;
  name: string;
  slug: string;
  kind: SectionKind;
}

export function SectionsAdmin() {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [subs, setSubs] = useState<SubsectionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SectionKind>("gameplay");
  const [groups, setGroups] = useState<SidebarGroupRow[]>([]);
  const [newGroup, setNewGroup] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, g] = await Promise.all([loadTaxonomy(), listSidebarGroups()]);
      setRows(t.sections);
      setSubs(t.subsections);
      setGroups(g);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn();
      if (done) toast(done);
      await load();
      // The side menu is loaded with the page; refresh it too.
      router.refresh();
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      toast(
        /section_groups|sections_group_id/i.test(msg)
          ? "This group still has sections. Move or delete them first."
          : /foreign key|violates foreign/i.test(msg)
          ? "This section still has cards. Move or delete them first."
          : /duplicate|unique/i.test(msg)
            ? "That link is already used here. Pick another name."
            : msg,
      );
      return false;
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const row = rows.find((r) => r.id === editing.id);
    const name = editing.name.trim();
    const slug = slugify(editing.slug);
    if (!name) return toast("Add a name.");
    if (!SLUG.test(slug)) return toast("The link may only use lowercase letters, numbers and dashes.");
    const patch: Partial<SectionRow> = {};
    if (name !== row?.name) patch.name = name;
    if (slug !== row?.slug) patch.slug = slug;
    if (editing.kind !== row?.kind) patch.kind = editing.kind;
    if (!Object.keys(patch).length) return setEditing(null);
    if (await run(() => updateSection(editing.id, patch), "Section saved")) setEditing(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = rows.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorder("sections", ids));
  };

  return (
    <AdminFrame title="Side menu">
      {error && <ErrorNote>{error}</ErrorNote>}
      <SidebarGroupsAdmin
        groups={groups}
        available={groups.length > 0}
        sectionCount={rows.reduce((m, r) => m.set(r.group_id, (m.get(r.group_id) ?? 0) + 1), new Map<string, number>())}
        run={run}
      />
      <p className="ng-tag">Sections</p>
      <h2 className="mb-4 mt-2 font-display text-2xl font-bold uppercase tracking-[0.04em]">Pages in the side menu</h2>
      <Panel className="mb-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const n = name.trim();
            setName("");
            const group_id = groups.find((g) => g.id === newGroup)?.id ?? groups[0]?.id;
            run(() => createSection({ name: n, slug: slugify(n), kind, ...(group_id ? { group_id } : {}) }), "Section added");
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="ng-label">New section</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Transitions" className="w-60" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="ng-label">Type (sets the card buttons)</span>
            <Select value={kind} onChange={(e) => setKind(e.target.value as SectionKind)} className="w-80">
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </label>
          {groups.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="ng-label">In sidebar group</span>
              <Select value={newGroup || groups[0]?.id} onChange={(e) => setNewGroup(e.target.value)} className="w-48">
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <Button type="submit" variant="primary">Add section</Button>
        </form>
      </Panel>
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Link</th>
              <th>Type</th>
              {groups.length > 0 && <th>Group</th>}
              <th>Shown in menu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const e = editing?.id === r.id ? editing : null;
              return (
                <tr key={r.id}>
                  <td>
                    <Button variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
                    <Button variant="ghost" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</Button>
                  </td>
                  <td>
                    {e ? (
                      <Input
                        autoFocus
                        value={e.name}
                        maxLength={60}
                        aria-label="Section name"
                        className="w-56"
                        onChange={(ev) => setEditing({ ...e, name: ev.target.value })}
                        onKeyDown={(ev) => ev.key === "Enter" && saveEdit()}
                      />
                    ) : (
                      <span className="font-medium">{r.name}</span>
                    )}
                  </td>
                  <td className="text-fg-2">
                    {e ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          /
                          <Input
                            value={e.slug}
                            aria-label="Section link"
                            className="w-44"
                            onChange={(ev) => setEditing({ ...e, slug: ev.target.value.toLowerCase().replace(/\s+/g, "-") })}
                            onKeyDown={(ev) => ev.key === "Enter" && saveEdit()}
                          />
                        </div>
                        {slugify(e.slug) !== r.slug && <span className="text-xs">Old links to this section and its cards will stop working.</span>}
                      </div>
                    ) : (
                      `/${r.slug}`
                    )}
                  </td>
                  <td>
                    {e ? (
                      <Select value={e.kind} aria-label="Section type" className="w-64" onChange={(ev) => setEditing({ ...e, kind: ev.target.value as SectionKind })}>
                        {KINDS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      KINDS.find((k) => k.value === r.kind)?.label.split(" (")[0]
                    )}
                  </td>
                  {groups.length > 0 && (
                    <td>
                      <Select
                        value={r.group_id}
                        aria-label={`Sidebar group of ${r.name}`}
                        className="w-40"
                        onChange={(ev) => run(() => updateSection(r.id, { group_id: ev.target.value }), "Section moved")}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                  )}
                  <td>
                    <Switch checked={r.is_visible} label={r.is_visible ? "Shown" : "Hidden"} onChange={(v) => run(() => updateSection(r.id, { is_visible: v }))} />
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      {e ? (
                        <>
                          <Button variant="primary" onClick={saveEdit}>
                            Save
                          </Button>
                          <Button onClick={() => setEditing(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => setEditing({ id: r.id, name: r.name, slug: r.slug, kind: r.kind })}>Edit</Button>
                          <ConfirmButton onConfirm={() => run(() => deleteSection(r.id), "Section deleted")} confirmLabel="Delete?">
                            Delete
                          </ConfirmButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SubsectionsAdmin sections={rows} subsections={subs} run={run} />
    </AdminFrame>
  );
}
