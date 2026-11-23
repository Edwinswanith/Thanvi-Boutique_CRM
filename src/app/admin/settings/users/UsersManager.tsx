"use client";

import { useState } from "react";
import { api } from "@/lib/http";
import type { UserView } from "@/server/services/users";
import { UserForm, type LocationOption, type RoleOption } from "./UserForm";

interface Props {
  initial: UserView[];
  roles: RoleOption[];
  locations: LocationOption[];
  selfId: string;
  perms: { create: boolean; edit: boolean };
}

export function UsersManager({ initial, roles, locations, selfId, perms }: Props) {
  const [users, setUsers] = useState(initial);
  const [editing, setEditing] = useState<UserView | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const locCode = new Map(locations.map((l) => [l.id, l.code]));
  const roleAll = new Map(roles.map((r) => [r.id, r.allLocations]));

  const visible = users.filter((u) =>
    `${u.name} ${u.email} ${u.roleName}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function upsert(u: UserView) {
    setUsers((prev) => (prev.some((p) => p.id === u.id) ? prev.map((p) => (p.id === u.id ? u : p)) : [...prev, u]));
    setEditing(null);
  }

  async function toggleActive(u: UserView) {
    setError(null);
    try {
      upsert(await api<UserView>(`/api/users/${u.id}`, { method: "PATCH", body: { active: !u.active } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update user");
    }
  }

  return (
    <div className="rise rise-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input className="field max-w-xs" placeholder="Search name, email or role" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        {perms.create && <button className="btn btn-gold" onClick={() => setEditing("new")}>+ Add user</button>}
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-madder">{error}</p>}

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3 font-semibold">Person</th>
              <th className="px-3 py-3 font-semibold">Role</th>
              <th className="px-3 py-3 font-semibold">Locations</th>
              <th className="px-3 py-3 font-semibold">Last sign-in</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className={`border-b border-line/70 last:border-0 ${u.active ? "" : "opacity-50"}`}>
                <td className="px-5 py-3">
                  <p className="font-semibold">{u.name}{u.id === selfId && <span className="ml-2 text-xs text-gold">you</span>}</p>
                  <p className="text-xs text-ink-soft">{u.email}</p>
                </td>
                <td className="px-3 py-3">{u.roleName}</td>
                <td className="px-3 py-3">
                  {roleAll.get(u.roleId) ? (
                    <span className="text-xs text-ink-soft">All locations</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {u.locationIds.length ? u.locationIds.map((id) => (
                        <span key={id} className="code rounded bg-gold-wash px-1.5 text-[11px]">{locCode.get(id) ?? "?"}</span>
                      )) : <span className="text-xs text-madder">None assigned</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-ink-soft">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : "Never"}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {perms.edit && (
                    <>
                      <button className="text-xs font-semibold text-ink-2 hover:underline" onClick={() => setEditing(u)}>Edit</button>
                      {u.id !== selfId && (
                        <button className="ml-4 text-xs font-semibold text-ink-soft hover:underline" onClick={() => toggleActive(u)}>
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-soft">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserForm
          user={editing === "new" ? null : editing}
          roles={roles}
          locations={locations}
          isSelf={editing !== "new" && editing.id === selfId}
          onClose={() => setEditing(null)}
          onSaved={upsert}
        />
      )}
    </div>
  );
}
