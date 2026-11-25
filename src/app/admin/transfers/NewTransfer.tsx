"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";
import type { LocationOption } from "@/server/services/myLocations";
import type { TransferView } from "@/server/services/transfers";

interface Props {
  mine: LocationOption[];
  all: LocationOption[];
  initialMode?: "request" | "direct";
  locationId?: string;
  allowSend: boolean;
}

interface Line { sku: string; description: string; qty: number }

/**
 * Two modes: a store REQUESTS stock from a godown (needs approval), or a
 * location SENDS stock directly (pick one destination, applies to all pieces).
 */
export function NewTransfer({ mine, all, initialMode, locationId, allowSend }: Props) {
  const router = useRouter();
  const allowRequest = mine.some((location) => location.type === "store") && all.some((location) => location.type === "godown");
  const modes: ("request" | "direct")[] = [...(allowRequest ? ["request" as const] : []), ...(allowSend ? ["direct" as const] : [])];
  const [mode, setMode] = useState<"request" | "direct">(initialMode && modes.includes(initialMode) ? initialMode : modes[0]);
  const [from, setFrom] = useState(mode === "direct" ? locationId ?? "" : "");
  const [to, setTo] = useState(mode === "request" ? locationId ?? (mine.length === 1 ? mine[0].id : "") : "");
  const [lines, setLines] = useState<Line[]>([{ sku: "", description: "", qty: 1 }]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fromOptions = mode === "request" ? all.filter((l) => l.type === "godown") : mine;
  const sourceId = fromOptions.find((location) => location.id === from)?.id ?? fromOptions[0]?.id ?? "";
  const destinations = mode === "request" ? mine.filter((location) => location.type === "store") : all;
  const toOptions = destinations.filter((location) => location.id !== sourceId);
  const destinationId = toOptions.find((location) => location.id === to)?.id ?? "";
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const t = await api<TransferView>("/api/transfers", {
        method: "POST",
        body: {
          fromLocationId: sourceId,
          toLocationId: destinationId,
          note,
          direct: mode === "direct",
          lines: lines.filter((l) => l.sku || l.description).map((l) => ({ ...l, qty: Number(l.qty) || 1 })),
        },
      });
      router.push(`/admin/transfers/${t.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create");
      setBusy(false);
    }
  }

  return (
    <section className="panel rise rise-1 p-6">
      <div className="mb-5 inline-flex rounded-md border border-line-strong p-0.5" role="tablist">
        {modes.map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded px-4 py-1.5 text-sm font-semibold ${mode === m ? "bg-ink text-paper" : "text-ink-soft"}`}>
            {m === "request" ? "Request stock" : "Send stock directly"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="t-from">{mode === "request" ? "Request from (godown)" : "Send from"}</label>
          <select id="t-from" className="field" value={sourceId} onChange={(e) => setFrom(e.target.value)}>
            {fromOptions.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="t-to">{mode === "request" ? "Deliver to (your store)" : "Destination — applies to all pieces"}</label>
          <select id="t-to" className="field" value={destinationId} onChange={(e) => setTo(e.target.value)}>
            <option value="" disabled>Select destination</option>
            {toOptions.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
          </select>
        </div>
      </div>
      {mode === "request" && (
        <div className="mt-5 space-y-2">
          <p className="label">What do you need?</p>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[110px_1fr_80px_auto]">
              <input aria-label="SKU" className="field code uppercase" placeholder="SKU" value={l.sku} onChange={(e) => setLine(i, { sku: e.target.value.toUpperCase() })} />
              <input aria-label="Description" className="field" placeholder="e.g. red silk sarees, wedding range" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
              <input aria-label="Quantity" className="field code" type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
              <button type="button" className="btn btn-ghost" aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}>×</button>
            </div>
          ))}
          <button type="button" className="text-sm font-semibold text-gold hover:underline" onClick={() => setLines((ls) => [...ls, { sku: "", description: "", qty: 1 }])}>+ Add line</button>
        </div>
      )}
      <div className="mt-4">
        <label className="label" htmlFor="t-note">Note</label>
        <input id="t-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Needed before the weekend sale" />
      </div>
      {error && <div className="mt-4"><Notice kind="err">{error}</Notice></div>}
      <div className="mt-5 flex justify-end">
        <button className="btn btn-gold" disabled={busy || !sourceId || !destinationId} onClick={submit}>
          {busy ? "Saving…" : mode === "request" ? "Send request" : "Create & scan pieces"}
        </button>
      </div>
    </section>
  );
}
