"use client";

// Subsections inside each section (e.g. FC Gameplay Clips > Shorts):
// add, rename, change link, show/hide, reorder, delete. Deleting one moves
// its cards back to the section's main list (the database does this).

import { useState } from "react";
import {
  createSubsection,
  deleteSubsection,
  reorder,
  slugify,
  updateSubsection,
  type SectionRow,
  type SubsectionRow,
} from "@/lib/admin-api";
import { Button, ConfirmButton, Input, Panel, Switch } from "./ui";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Run = (fn: () => Promise<unknown>, done?: string) => Promise<boolean>;

export function SubsectionsAdmin({ sections, subsections, run }: { sections: SectionRow[]; subsections: SubsectionRow[]; run: Run }) {
  if (!sections.length) return null;
  return (
    <section className="mt-8">
      <p className="ng-tag">Subsections</p>
      <h2 className="mt-2 text-2xl font-bold uppercase">Inside each section</h2>
      <p className="mt-1 text-sm text-fg-2">
        Optional groups inside a section, shown under it in the side menu. A card can be in one subsection or in the
        section&apos;s main list.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <SectionSubs key={s.id} section={s} subs={subsections.filter((x) => x.section_id === s.id)} run={run} />
        ))}
      </div>
    </section>
  );
}

function SectionSubs({ section, subs, run }: { section: SectionRow; subs: SubsectionRow[]; run: Run }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string; slug: string } | null>(null);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const slug = slugify(n).slice(0, 60);
    if (!SLUG.test(slug)) return;
    setName("");
    run(() => createSubsection({ section_id: section.id, name: n, slug }), "Subsection added");
  };

  const save = async () => {
    if (!editing) return;
    const n = editing.name.trim();
    const slug = slugify(editing.slug).slice(0, 60);
    if (!n || !SLUG.test(slug)) return;
    if (await run(() => updateSubsection(editing.id, { name: n, slug }), "Subsection saved")) setEditing(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = subs.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorder("subsections", ids));
  };

  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold uppercase">{section.name}</h3>
        <span className="text-xs text-fg-2">/{section.slug}</span>
      </div>

      {subs.length === 0 ? (
        <p className="mt-3 text-sm text-fg-2">No subsections.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {subs.map((r, i) => {
            const e = editing?.id === r.id ? editing : null;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <Button variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </Button>
                <Button variant="ghost" aria-label="Move down" disabled={i === subs.length - 1} onClick={() => move(i, 1)}>
                  ↓
                </Button>
                {e ? (
                  <>
                    <Input
                      autoFocus
                      value={e.name}
                      maxLength={60}
                      aria-label="Subsection name"
                      className="w-40"
                      onChange={(ev) => setEditing({ ...e, name: ev.target.value })}
                      onKeyDown={(ev) => ev.key === "Enter" && save()}
                    />
                    <Input
                      value={e.slug}
                      maxLength={60}
                      aria-label="Subsection link"
                      className="w-32"
                      onChange={(ev) => setEditing({ ...e, slug: ev.target.value.toLowerCase().replace(/\s+/g, "-") })}
                      onKeyDown={(ev) => ev.key === "Enter" && save()}
                    />
                    <Button variant="primary" onClick={save}>
                      Save
                    </Button>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-xs text-fg-2">?sub={r.slug}</span>
                    </span>
                    <Switch
                      checked={r.is_visible}
                      label={r.is_visible ? "Shown" : "Hidden"}
                      onChange={(v) => run(() => updateSubsection(r.id, { is_visible: v }))}
                    />
                    <Button onClick={() => setEditing({ id: r.id, name: r.name, slug: r.slug })}>Edit</Button>
                    <ConfirmButton
                      onConfirm={() => run(() => deleteSubsection(r.id), "Subsection deleted; its cards moved to the main list")}
                      confirmLabel="Delete?"
                    >
                      Delete
                    </ConfirmButton>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="New subsection, e.g. Shorts"
          aria-label={`New subsection in ${section.name}`}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="primary">
          Add
        </Button>
      </form>
    </Panel>
  );
}
