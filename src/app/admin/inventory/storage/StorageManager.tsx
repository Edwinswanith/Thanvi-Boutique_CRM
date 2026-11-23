"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";
import type { BinView } from "@/server/services/bins";
import type { LocationOption } from "@/server/services/myLocations";

interface Props {
  locations: LocationOption[];
  initialLocationId: string;
  canEdit: boolean;
}

/** Groups bins by rack ("R2-S3" → rack "R2") for a floor-plan-like view. */
function byRack(bins: BinView[]): [string, BinView[]][] {
  const map = new Map<string, BinView[]>();
  for (const b of bins) {
    const rack = b.code.includes("-") ? b.code.split("-")[0] : "Other";
    map.set(rack, [...(map.get(rack) ?? []), b]);
  }
  return [...map.entries()];
}

export function StorageManager({ locations, initialLocationId, canEdit }: Props) {
  const [locationId, setLocationId] = useState(initialLocationId);
  const [bins, setBins] = useState<BinView[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!locationId) return;
    try {
      setBins(await api<BinView[]>(`/api/bins?locationId=${locationId}`));
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not load bins" });
    }
  }, [locationId]);
  useEffect(() => void load(), [load]);

  async function grid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ created: number }>("/api/bins/grid", {
        method: "POST",
        body: { locationId, prefix: f.get("prefix") || "R", racks: Number(f.get("racks")), shelves: Number(f.get("shelves")), zone: f.get("zone") },
      });
      setMsg({ kind: "ok", text: `${r.created} new bin(s) created` });
      await load();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not create bins" });
    }
  }

  async function single() {
    const code = window.prompt("Bin code (e.g. DISPLAY-1, COUNTER, R5-S1)");
    if (!code?.trim()) return;
    try {
      await api("/api/bins", { method: "POST", body: { locationId, code } });
      await load();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not create bin" });
    }
  }

  if (!locations.length) return <Notice kind="warn">You are not assigned to any godown or store.</Notice>;
  const loc = locations.find((l) => l.id === locationId);
  const total = bins.reduce((a, b) => a + b.pieces, 0);

  return (
    <div className="space-y-6">
      <div className="rise flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="s-loc">Location</label>
          <select id="s-loc" className="field min-w-56" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
          </select>
        </div>
        <p className="pb-2 text-sm text-ink-soft">{bins.length} bins · {total} pieces shelved</p>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      {canEdit && (
        <form onSubmit={grid} className="panel rise rise-1 flex flex-wrap items-end gap-3 p-5">
          <p className="w-full font-semibold">Add racks & shelves to {loc?.name}</p>
          <div><label className="label" htmlFor="g-prefix">Rack prefix</label><input id="g-prefix" name="prefix" defaultValue="R" className="field code w-20 uppercase" maxLength={6} /></div>
          <div><label className="label" htmlFor="g-racks">Racks</label><input id="g-racks" name="racks" type="number" min={1} max={50} defaultValue={4} className="field code w-24" /></div>
          <div><label className="label" htmlFor="g-shelves">Shelves each</label><input id="g-shelves" name="shelves" type="number" min={1} max={20} defaultValue={5} className="field code w-24" /></div>
          <div><label className="label" htmlFor="g-zone">Zone (optional)</label><input id="g-zone" name="zone" className="field w-40" placeholder="Silk section" /></div>
          <button className="btn btn-primary">Create grid</button>
          <button type="button" className="btn btn-ghost" onClick={single}>+ Single bin</button>
        </form>
      )}

      <div className="rise rise-2 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {byRack(bins).map(([rack, list]) => (
          <section key={rack} className="panel overflow-hidden">
            <div className="flex items-center justify-between bg-ink px-4 py-2 text-paper">
              <span className="display text-lg">Rack {rack}</span>
              <span className="code text-xs text-gold-bright">{list.reduce((a, b) => a + b.pieces, 0)} pcs</span>
            </div>
            <ul className="divide-y divide-line">
              {list.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="code">{b.code}{b.zone && <span className="ml-2 font-sans text-xs text-ink-soft">{b.zone}</span>}</span>
                  <span className={`code ${b.pieces ? "font-semibold" : "text-ink-soft"}`}>{b.pieces}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!bins.length && <p className="text-sm text-ink-soft">No bins yet for this location.</p>}
      </div>
    </div>
  );
}
