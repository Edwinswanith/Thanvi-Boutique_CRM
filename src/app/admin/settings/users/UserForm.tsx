"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/admin/Modal";
import { api } from "@/lib/http";
import type { UserView } from "@/server/services/users";

export interface RoleOption { id: string; name: string; allLocations: boolean; assignable: boolean }
export interface LocationOption { id: string; code: string; name: string }

interface Props {
  user: UserView | null;
  roles: RoleOption[];
  locations: LocationOption[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: (u: UserView) => void;
}

export function UserForm({ user, roles, locations, isSelf, onClose, onSaved }: Props) {
  const availableRoles = roles.filter((r) => r.assignable || r.id === user?.roleId);
  const [roleId, setRoleId] = useState(user?.roleId ?? availableRoles.find((r) => r.name === "Salesperson")?.id ?? availableRoles[0]?.id ?? "");
  const [locIds, setLocIds] = useState<Set<string>>(new Set(user?.locationIds ?? []));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const role = roles.find((r) => r.id === roleId);

  function toggleLoc(id: string) {
    setLocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    const body = {
      name: f.get("name"),
      email: f.get("email"),
      phone: f.get("phone"),
      roleId,
      locationIds: role?.allLocations ? [] : [...locIds],
      ...(password ? { password } : {}),
    };
    setBusy(true);
    setError(null);
    try {
      const saved = user
        ? await api<UserView>(`/api/users/${user.id}`, { method: "PATCH", body })
        : await api<UserView>("/api/users", { method: "POST", body });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user");
      setBusy(false);
    }
  }

  return (
    <Modal title={user ? `Edit ${user.name}` : "Add user"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="u-name">Full name</label>
            <input id="u-name" name="name" required minLength={2} defaultValue={user?.name} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="u-phone">Phone</label>
            <input id="u-phone" name="phone" defaultValue={user?.phone} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="u-email">Email (login)</label>
            <input id="u-email" name="email" type="email" required defaultValue={user?.email} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="u-password">{user ? "New password (leave blank to keep)" : "Temporary password"}</label>
            <input id="u-password" name="password" type="password" autoComplete="new-password" required={!user} minLength={10} className="field" />
            <p className="mt-1 text-xs text-ink-soft">At least 10 characters with a letter and a number.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="u-role">Role</label>
          <select id="u-role" className="field" value={roleId} disabled={isSelf} onChange={(e) => setRoleId(e.target.value)}>
            {availableRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {isSelf && <p className="mt-1 text-xs text-ink-soft">You can&apos;t change your own role.</p>}
        </div>

        {role && !role.allLocations && (
          <fieldset>
            <legend className="label">Works at</legend>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => {
                const on = locIds.has(l.id);
                return (
                  <button key={l.id} type="button" onClick={() => toggleLoc(l.id)} aria-pressed={on}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}>
                    <span className="code">{l.code}</span> · {l.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        {role?.allLocations && <p className="text-xs text-ink-soft">This role covers all locations automatically.</p>}

        {error && <p role="alert" className="rounded-md bg-madder-wash px-3 py-2 text-sm text-madder">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : user ? "Save" : "Create user"}</button>
        </div>
      </form>
    </Modal>
  );
}
