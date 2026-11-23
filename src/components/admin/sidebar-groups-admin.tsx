"use client";

// Sidebar groups: the top-level buttons of the side menu (e.g. "Vault").
// Tapping a group in the menu opens its sections. The admin can add any
// number, rename, show/hide, reorder and delete them (a group must be empty
// before it can be deleted). Sections are put into groups in the table below.

import { useState } from "react";
import { createSidebarGroup, deleteSidebarGroup, reorder, slugify, updateSidebarGroup, type SidebarGroupRow } from "@/lib/admin-api";
import { Button, ConfirmButton, Input, Panel, Switch } from "./ui";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type Run = (fn: () => Promise<unknown>, done?: string) => Promise<boolean>;

export function SidebarGroupsAdmin({
  groups,
  sectionCount,
  available,
  run,
}: {
  groups: SidebarGroupRow[];
  /** Sections per group id. */
  sectionCount: Map<string, number>;
  /** False until the sidebar-groups migration has run. */
  available: boolean;
  run: Run;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const add = () => {
    const n = name.trim();
    const slug = slugify(n).slice(0, 60);
    if (!n || !SLUG.test(slug)) return;
    setName("");
    run(() => createSidebarGroup(n, slug), "Group added to the side menu");
  };

  const save = async () => {
    if (!editing) return;
    const n = editing.name.trim();
    if (!n) return;
    if (await run(() => updateSidebarGroup(editing.id, { name: n }), "Group renamed")) setEditing(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = groups.map((g) => g.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => reorder("section_groups", ids));
  };

  return (
    <section className="mb-8">
      <p className="ng-tag">Side menu</p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.04em]">Sidebar groups</h2>
      <p className="mt-1 text-sm text-fg-2">
        The top-level buttons of the side menu, like <b className="text-fg">Vault</b>. Tapping one opens its sections.
        Add as many as you need (for example a group for social videos), then choose each section&apos;s group in the
        table below.
      </p>

      {!available ? (
        <Panel className="mt-4">
          <p className="text-sm text-fg-2">
            Sidebar groups are switched on once the database update for them has been applied. Until then all sections show
            under one “Vault” group.
          </p>
        </Panel>
      ) : (
        <Panel className="mt-4">
          <ul className="divide-y divide-line border-y border-line">
            {groups.map((g, i) => {
              const e = editing?.id === g.id ? editing : null;
              const count = sectionCount.get(g.id) ?? 0;
              return (
                <li key={g.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Button variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </Button>
                  <Button variant="ghost" aria-label="Move down" disabled={i === groups.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </Button>
                  {e ? (
                    <>
                      <Input
                        autoFocus
                        value={e.name}
                        maxLength={60}
                        aria-label="Group name"
                        className="w-56"
                        onChange={(ev) => setEditing({ ...e, name: ev.target.value })}
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
                        <span className="font-display text-base font-bold uppercase tracking-[0.12em]">{g.name}</span>
                        <span className="ml-3 text-xs text-fg-2">
                          {count} section{count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <Switch
                        checked={g.is_visible}
                        label={g.is_visible ? "Shown" : "Hidden"}
                        onChange={(v) => run(() => updateSidebarGroup(g.id, { is_visible: v }))}
                      />
                      <Button onClick={() => setEditing({ id: g.id, name: g.name })}>Rename</Button>
                      {count > 0 ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-fg-2">
                            To delete, move or delete its {count} section{count === 1 ? "" : "s"} first
                          </span>
                          <Button disabled title="Move or delete its sections first">
                            Delete
                          </Button>
                        </span>
                      ) : (
                        <ConfirmButton onConfirm={() => run(() => deleteSidebarGroup(g.id), "Group deleted")} confirmLabel="Delete?">
                          Delete
                        </ConfirmButton>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
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
              placeholder="New group, e.g. Socials"
              aria-label="New sidebar group"
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="primary">
              Add group
            </Button>
          </form>
        </Panel>
      )}
    </section>
  );
}
