"use client";

// Users (R13, R14, R19): only the admin creates logins. Access is All, or a
// set of side-menu items (groups, sections, subsections) the editor may see. Disable takes effect immediately (RLS checks is_active, and the
// login is banned so the session can't refresh).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUser,
  emptyMenu,
  listSidebarGroups,
  listUsers,
  loadTaxonomy,
  manageUser,
  type MenuAccess,
  type UserWithAccess,
} from "@/lib/admin-api";
import { Modal } from "../modal";
import { useHub } from "../hub-context";
import { useToast } from "../toast";
import { MenuAccessPicker, MenuAccessSummary, type MenuTree } from "./menu-access-picker";
import { AdminFrame, Badge, Button, ConfirmButton, ErrorNote, Field, Input, Switch, TABLE } from "./ui";

/** Same rule as the server (admin Edge Functions, supabase/config.toml):
 *  12+ characters with a lower-case letter, an upper-case letter and a digit. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 12) return "The password needs at least 12 characters.";
  if (pw.length > 72) return "The password can have at most 72 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "The password needs a lower-case letter, an upper-case letter and a digit.";
  }
  return null;
}

/** 16 random characters (no look-alikes), always meeting the rule above. */
function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint32Array(16));
    const pw = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    if (!passwordProblem(pw)) return pw;
  }
}

function status(u: UserWithAccess): { label: string; tone: "green" | "red" | "plain" } {
  if (!u.is_active) return { label: "Disabled", tone: "red" };
  if (u.expires_at && new Date(u.expires_at) <= new Date()) return { label: "Expired", tone: "red" };
  return { label: "Active", tone: "green" };
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (d: string) => (d ? new Date(`${d}T23:59:59`).toISOString() : null);

interface Draft {
  email: string;
  name: string;
  password: string;
  allAccess: boolean;
  menu: MenuAccess;
  expires: string;
}

const menuCount = (m: MenuAccess) => m.group_ids.length + m.section_ids.length + m.subsection_ids.length;

function UserForm({
  mode,
  initial,
  tree,
  showAccess = true,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: Draft;
  tree: MenuTree;
  /** Off for admins and your own account (admins always see everything). */
  showAccess?: boolean;
  onCancel: () => void;
  onSubmit: (d: Draft) => Promise<void>;
}) {
  const [d, setD] = useState(initial);
  const [neverExpires, setNeverExpires] = useState(initial.expires === "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 px-5 pb-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (showAccess && !d.allAccess && menuCount(d.menu) === 0) {
          return setError("Choose at least one side-menu item, or turn on All access.");
        }
        if (d.password) {
          const pw = passwordProblem(d.password);
          if (pw) return setError(pw);
        }
        setBusy(true);
        setError(null);
        try {
          await onSubmit(neverExpires ? { ...d, expires: "" } : d);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      {mode === "create" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input data-autofocus type="email" required value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
          </Field>
          <Field label="Name">
            <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Karthikeya" />
          </Field>
          <Field label="Password" hint="Share it privately. The editor signs in with this password." className="sm:col-span-2">
            <div className="flex gap-2">
              <Input required minLength={12} maxLength={72} value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} className="font-mono" />
              <Button onClick={() => setD({ ...d, password: tempPassword() })}>Generate</Button>
              <Button onClick={() => navigator.clipboard.writeText(d.password).catch(() => {})}>Copy</Button>
            </div>
          </Field>
        </div>
      )}
      {mode === "edit" && (
        <Field label="Name">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
      )}
      <div className="flex flex-col gap-3">
        <Switch checked={neverExpires} onChange={setNeverExpires} label="Never expires" />
        {!neverExpires && (
          <Field label="Account expires on" hint="The account stops working after this day.">
            <Input type="date" required value={d.expires} onChange={(e) => setD({ ...d, expires: e.target.value })} className="w-48" />
          </Field>
        )}
      </div>
      {showAccess && (
        <div className="flex flex-col gap-3">
          <Switch checked={d.allAccess} onChange={(v) => setD({ ...d, allAccess: v })} label="All access (sees the whole side menu and every published card; on by default)" />
          {!d.allAccess && (
            <div className="ng-panel p-3">
              <p className="ng-label">Can see only these side-menu items · {menuCount(d.menu)}</p>
              <p className="mb-3 mt-1 text-xs text-fg-2">
                Tick a group for everything in it, a section for the whole section, or single subsections. The editor sees
                only these in the side menu, and only the cards inside them.
              </p>
              <MenuAccessPicker tree={tree} value={d.menu} onChange={(menu) => setD({ ...d, menu })} />
            </div>
          )}
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create user" : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function UsersAdmin() {
  const toast = useToast();
  const { user: me } = useHub();
  const [users, setUsers] = useState<UserWithAccess[]>([]);
  const [tree, setTree] = useState<MenuTree>({ groups: [], sections: [], subsections: [] });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserWithAccess | null>(null);
  const [reset, setReset] = useState<{ user: UserWithAccess; password: string } | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const [u, t, g] = await Promise.all([listUsers(), loadTaxonomy(), listSidebarGroups()]);
      setUsers(u);
      setTree({ groups: g, sections: t.sections, subsections: t.subsections });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the database
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast(done);
      await load();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return users.filter((u) => !n || u.email.toLowerCase().includes(n) || u.display_name.toLowerCase().includes(n));
  }, [users, q]);

  return (
    <AdminFrame title="Users" actions={<Button variant="primary" onClick={() => setCreating(true)}>Add user</Button>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className="mb-4 max-w-md" />
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access</th>
              <th>Expires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => {
              const s = status(u);
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium">{u.display_name || "—"}</p>
                    <p className="text-xs text-fg-2">{u.email}</p>
                  </td>
                  <td>{u.role === "admin" ? "Admin" : "Editor"}</td>
                  <td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </td>
                  <td className="max-w-[240px]">{u.all_access || u.role === "admin" ? "All" : <MenuAccessSummary tree={tree} value={u.menu} />}</td>
                  <td className="whitespace-nowrap">{u.expires_at ? new Date(u.expires_at).toLocaleDateString() : "Never"}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button onClick={() => setEditing(u)}>Edit</Button>
                      <Button onClick={() => setReset({ user: u, password: tempPassword() })}>Reset password</Button>
                      {!self &&
                        (u.is_active ? (
                          <ConfirmButton onConfirm={() => act(() => manageUser("disable", u.id), `${u.email} is locked out`)} confirmLabel="Disable now?">
                            Disable
                          </ConfirmButton>
                        ) : (
                          <Button onClick={() => act(() => manageUser("enable", u.id), "Re-enabled")}>Enable</Button>
                        ))}
                      {!self && (
                        <ConfirmButton onConfirm={() => act(() => manageUser("delete", u.id), "User deleted")} confirmLabel="Delete forever?">
                          Delete
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add user">
        {creating && (
          <UserForm
            mode="create"
            initial={{ email: "", name: "", password: tempPassword(), allAccess: true, menu: emptyMenu(), expires: "" }}
            tree={tree}
            onCancel={() => setCreating(false)}
            onSubmit={async (d) => {
              await createUser({
                email: d.email.trim(),
                password: d.password,
                display_name: d.name.trim(),
                all_access: d.allAccess,
                menu: d.allAccess ? emptyMenu() : d.menu,
                expires_at: fromDateInput(d.expires),
              });
              setCreating(false);
              toast("User created. Share the email and password with them privately.");
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.email ?? ""}`}>
        {editing && (
          <UserForm
            mode="edit"
            initial={{
              email: editing.email,
              name: editing.display_name,
              password: "",
              allAccess: editing.all_access,
              menu: editing.menu,
              expires: toDateInput(editing.expires_at),
            }}
            tree={tree}
            showAccess={editing.id !== me.id && editing.role !== "admin"}
            onCancel={() => setEditing(null)}
            onSubmit={async (d) => {
              await manageUser("update", editing.id, { display_name: d.name, expires_at: fromDateInput(d.expires) });
              if (editing.id !== me.id && editing.role !== "admin") {
                await manageUser("set_access", editing.id, { all_access: d.allAccess, menu: d.allAccess ? emptyMenu() : d.menu });
              }
              setEditing(null);
              toast("Saved");
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={!!reset} onClose={() => setReset(null)} title="Reset password">
        {reset && (
          <div className="flex flex-col gap-4 px-5 pb-5">
            <p className="text-sm">
              New password for <b>{reset.user.email}</b>. Share it privately; the old one stops working.
            </p>
            <div className="flex gap-2">
              <Input value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} className="font-mono" minLength={12} maxLength={72} />
              <Button onClick={() => navigator.clipboard.writeText(reset.password).catch(() => {})}>Copy</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReset(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const r = reset;
                  const pw = passwordProblem(r.password);
                  if (pw) return toast(pw);
                  setReset(null);
                  act(() => manageUser("reset_password", r.user.id, { password: r.password }), "Password reset");
                }}
              >
                Reset password
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminFrame>
  );
}
