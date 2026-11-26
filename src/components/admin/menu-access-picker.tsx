"use client";

// Picks which side-menu items a restricted editor (All access off) may see:
//   Group      -> everything in it, including sections added later
//   Section    -> the whole section and all its subsections
//   Subsection -> only that subsection
// Items covered by a ticked parent show as ticked and locked. The database
// applies the same rules (migration 20261126100000_menu_access.sql).

import type { MenuAccess, SectionRow, SidebarGroupRow, SubsectionRow } from "@/lib/admin-api";

export interface MenuTree {
  groups: SidebarGroupRow[];
  sections: SectionRow[];
  subsections: SubsectionRow[];
}

type Kind = keyof MenuAccess;

function toggle(m: MenuAccess, kind: Kind, id: string): MenuAccess {
  const list = m[kind];
  return { ...m, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] };
}

function Row({
  label,
  hint,
  checked,
  locked,
  depth,
  hidden,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  locked: boolean;
  depth: 0 | 1 | 2;
  hidden: boolean;
  onChange: () => void;
}) {
  const pad = ["pl-2", "pl-8", "pl-14"][depth];
  return (
    <label
      className={`flex min-h-9 cursor-pointer items-center gap-3 border-l-2 py-1.5 pr-2 ${pad} ${
        checked ? "border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_7%,transparent)]" : "border-transparent hover:bg-hover"
      } ${locked ? "cursor-default opacity-70" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={onChange}
        className="size-4 shrink-0 cursor-pointer accent-[var(--green)] disabled:cursor-default"
      />
      <span className={`min-w-0 flex-1 ${depth === 0 ? "ng-frame-title text-[13px]" : "text-sm"}`}>
        {label}
        {hidden && <span className="ml-2 text-xs text-fg-2">(hidden in menu)</span>}
      </span>
      {hint && <span className="shrink-0 text-xs text-fg-2">{hint}</span>}
    </label>
  );
}

export function MenuAccessPicker({ tree, value, onChange }: { tree: MenuTree; value: MenuAccess; onChange: (m: MenuAccess) => void }) {
  if (!tree.groups.length) return <p className="text-sm text-fg-2">No side-menu groups yet. Add them in Admin → Side menu.</p>;
  return (
    <div className="flex max-h-[320px] flex-col gap-0.5 overflow-y-auto pr-1">
      {tree.groups.map((g) => {
        const gOn = value.group_ids.includes(g.id);
        const secs = tree.sections.filter((s) => s.group_id === g.id);
        return (
          <div key={g.id} className="mb-1">
            <Row
              label={g.name}
              hint={gOn ? "Whole group, incl. new sections" : "Whole group"}
              checked={gOn}
              locked={false}
              depth={0}
              hidden={!g.is_visible}
              onChange={() => onChange(toggle(value, "group_ids", g.id))}
            />
            {secs.map((s) => {
              const sOn = gOn || value.section_ids.includes(s.id);
              const subs = tree.subsections.filter((x) => x.section_id === s.id);
              return (
                <div key={s.id}>
                  <Row
                    label={s.name}
                    hint={subs.length ? "Whole section" : undefined}
                    checked={sOn}
                    locked={gOn}
                    depth={1}
                    hidden={!s.is_visible}
                    onChange={() => onChange(toggle(value, "section_ids", s.id))}
                  />
                  {subs.map((x) => (
                    <Row
                      key={x.id}
                      label={x.name}
                      checked={sOn || value.subsection_ids.includes(x.id)}
                      locked={sOn}
                      depth={2}
                      hidden={!x.is_visible}
                      onChange={() => onChange(toggle(value, "subsection_ids", x.id))}
                    />
                  ))}
                </div>
              );
            })}
            {secs.length === 0 && <p className="py-1 pl-8 text-xs text-fg-2">No sections in this group yet.</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Short text for the users table, e.g. "Vault, Socials › Reels". */
export function MenuAccessSummary({ tree, value }: { tree: MenuTree; value: MenuAccess }) {
  const names = [
    ...value.group_ids.map((id) => tree.groups.find((g) => g.id === id)?.name),
    ...value.section_ids.map((id) => tree.sections.find((s) => s.id === id)?.name),
    ...value.subsection_ids.map((id) => {
      const x = tree.subsections.find((y) => y.id === id);
      const s = x && tree.sections.find((y) => y.id === x.section_id);
      return x ? `${s?.name ?? ""} › ${x.name}` : undefined;
    }),
  ].filter((n): n is string => !!n);
  if (!names.length) return <span className="text-fg-2">Nothing</span>;
  return (
    <span className="line-clamp-2" title={names.join(", ")}>
      {names.join(", ")}
    </span>
  );
}
