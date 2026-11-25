"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/http";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
import type { RoleView } from "@/server/services/roles";
import { PermissionMatrix } from "./PermissionMatrix";

interface Props {
  initial: RoleView[];
  currentRoleId: string;
  canGrantConfidential: boolean;
  perms: { create: boolean; edit: boolean; remove: boolean };
}

interface Draft {
  name: string;
  description: string;
  permissions: Set<string>;
  confidential: boolean;
  allLocations: boolean;
}

const toDraft = (r?: RoleView): Draft => ({
  name: r?.name ?? "",
  description: r?.description ?? "",
  permissions: new Set(r?.permissions ?? []),
  confidential: r?.confidential ?? false,
  allLocations: r?.allLocations ?? false,
});

export function RolesManager({ initial, currentRoleId, canGrantConfidential, perms }: Props) {
  const [roles, setRoles] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | "new">(initial.find((r) => !r.isSystem)?.id ?? initial[0]?.id);
  const selected = roles.find((r) => r.id === selectedId);
  const [draft, setDraft] = useState<Draft>(toDraft(selected));
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const isNew = selectedId === "new";
  const owner = !!selected && isOwnerAdmin(selected);
  const locked = !isNew && (owner || !!selected?.isSystem || (!!selected?.confidential && !canGrantConfidential) || selected?.id === currentRoleId || !perms.edit);
  const dirty = useMemo(() => {
    const base = toDraft(selected);
    return isNew || JSON.stringify({ ...draft, permissions: [...draft.permissions].sort() }) !== JSON.stringify({ ...base, permissions: [...base.permissions].sort() });
  }, [draft, selected, isNew]);

  function select(id: string | "new") {
    setSelectedId(id);
    setDraft(toDraft(id === "new" ? undefined : roles.find((r) => r.id === id)));
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    const body = { ...draft, permissions: [...draft.permissions] };
    try {
      const saved = isNew
        ? await api<RoleView>("/api/roles", { method: "POST", body })
        : await api<RoleView>(`/api/roles/${selectedId}`, { method: "PATCH", body });
      setRoles((prev) => (isNew ? [...prev, saved] : prev.map((r) => (r.id === saved.id ? { ...saved, userCount: r.userCount } : r))));
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setStatus({ kind: "ok", text: "Saved" });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete the role "${selected.name}"?`)) return;
    try {
      await api(`/api/roles/${selected.id}`, { method: "DELETE" });
      const rest = roles.filter((r) => r.id !== selected.id);
      setRoles(rest);
      select(rest[0]?.id ?? "new");
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Could not delete" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rise rise-1 space-y-1">
        {roles.map((r) => (
          <button key={r.id} onClick={() => select(r.id)}
            className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${selectedId === r.id ? "border-ink bg-ink text-paper" : "border-transparent hover:border-line-strong hover:bg-card"}`}>
            <span className="flex items-center justify-between">
              <span className="font-semibold">{r.name}</span>
              <span className={`code text-[11px] ${selectedId === r.id ? "text-gold-bright" : "text-ink-soft"}`}>{r.userCount}</span>
            </span>
            <span className={`mt-0.5 block text-[11px] uppercase tracking-wider ${selectedId === r.id ? "text-paper/60" : "text-ink-soft"}`}>
              {r.isSystem ? "System · setup only" : r.builtIn ? "Built-in" : "Custom"}
              {r.confidential ? " · confidential" : ""}
            </span>
          </button>
        ))}
        {perms.create && (
          <button onClick={() => select("new")} className={`w-full rounded-md border border-dashed px-4 py-3 text-left text-sm font-semibold ${isNew ? "border-gold bg-gold-wash" : "border-gold/60 text-gold hover:bg-gold-wash/60"}`}>
            + New role
          </button>
        )}
      </aside>

      <section className="panel rise rise-2 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="role-name">Role name</label>
            <input id="role-name" className="field" disabled={locked} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="role-desc">Description</label>
            <input id="role-desc" className="field" disabled={locked} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </div>

        {locked && selected && (
          <p className="mt-4 rounded-md border border-gold/40 bg-gold-wash px-3 py-2 text-sm">
            {selected.isSystem || owner
              ? "This administrator role has fixed permissions."
              : selected.id === currentRoleId
                ? "This is your own role. Another administrator must change it."
                : "You can view this role but not edit it."}
          </p>
        )}

        {!selected?.isSystem && (
          <div className="mt-5 flex flex-wrap gap-6">
            <Toggle label="All locations" hint="Ignore store/godown assignment" checked={draft.allLocations} disabled={locked}
              onChange={(v) => setDraft({ ...draft, allLocations: v })} />
            <Toggle label="Confidential data" hint="Cost price, margins, financial reports" checked={draft.confidential} disabled={locked || !canGrantConfidential}
              onChange={(v) => setDraft({ ...draft, confidential: v })} />
          </div>
        )}

        <div className="mt-6">
          <PermissionMatrix isSystem={!!selected?.isSystem && !isNew} includeSetup={owner} value={draft.permissions} disabled={locked}
            onChange={(p) => setDraft({ ...draft, permissions: p })} />
        </div>

        {!locked && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="text-sm">
              {status && <span role="status" className={status.kind === "ok" ? "text-leaf" : "text-madder"}>{status.text}</span>}
            </div>
            <div className="flex gap-2">
              {!isNew && perms.remove && !selected?.builtIn && <button className="btn btn-danger" onClick={remove}>Delete</button>}
              <button className="btn btn-primary" disabled={busy || !dirty || draft.name.trim().length < 2} onClick={save}>
                {busy ? "Saving…" : isNew ? "Create role" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Toggle(props: { label: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-start gap-3 ${props.disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" checked={props.checked} disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-semibold">{props.label}</span>
        <span className="block text-xs text-ink-soft">{props.hint}</span>
      </span>
    </label>
  );
}
