"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { api } from "@/lib/http";
import type { LocationView } from "@/server/services/locations";

interface Draft {
  type: LocationView["type"];
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  gstin: string;
  invoicePrefix: string;
  acceptsVendorStock: boolean;
}

const EMPTY: Draft = { type: "store", name: "", code: "", address: "", city: "", phone: "", gstin: "", invoicePrefix: "", acceptsVendorStock: false };
const STEPS = ["Identity", "Address & GST", "Review"] as const;
const TYPES: Array<{ value: Draft["type"]; label: string; hint: string }> = [
  { value: "store", label: "Store", hint: "Walk-in shop with billing" },
  { value: "godown", label: "Godown", hint: "Warehouse, no billing" },
  { value: "online", label: "Online", hint: "Website or social channel" },
];

function suggestCode(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return words.map((w) => (/^\d+$/.test(w) ? w : w[0])).join("").slice(0, 6);
}

interface Props {
  onClose: () => void;
  onCreated: (loc: LocationView) => void;
}

export function StoreWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const canNext = step === 0 ? draft.name.trim().length >= 2 && draft.code.trim().length >= 2 : true;
  const prefix = draft.invoicePrefix || `${draft.code}-`;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      onCreated(await api<LocationView>("/api/locations", { method: "POST", body: draft }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create location");
      setBusy(false);
    }
  }

  return (
    <Modal title="New location" onClose={onClose}>
      <ol className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 border-t-2 pt-2 text-xs font-semibold uppercase tracking-wider ${i <= step ? "border-gold text-ink" : "border-line text-ink-soft"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => set("type", t.value)}
                className={`rounded-md border p-3 text-left transition-colors ${draft.type === t.value ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className={`text-[11px] ${draft.type === t.value ? "text-paper/70" : "text-ink-soft"}`}>{t.hint}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="loc-name">Name</label>
            <input id="loc-name" className="field" value={draft.name} placeholder="Shop 5 — T. Nagar"
              onChange={(e) => {
                const name = e.target.value;
                setDraft((d) => ({ ...d, name, code: d.code && d.code !== suggestCode(d.name) ? d.code : suggestCode(name) }));
              }} />
          </div>
          <div>
            <label className="label" htmlFor="loc-code">Short code</label>
            <input id="loc-code" className="field code uppercase" maxLength={12} value={draft.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())} />
            <p className="mt-1 text-xs text-ink-soft">Used on barcodes and invoices. Letters, numbers and hyphens. Cannot be changed later.</p>
          </div>
          {draft.type === "godown" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.acceptsVendorStock} onChange={(event) => set("acceptsVendorStock", event.target.checked)} />
              Receive vendor stock at this godown
            </label>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="loc-address">Address</label>
            <input id="loc-address" className="field" value={draft.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="loc-city">City</label>
            <input id="loc-city" className="field" value={draft.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="loc-phone">Phone</label>
            <input id="loc-phone" className="field" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="loc-gstin">GSTIN</label>
            <input id="loc-gstin" className="field code uppercase" maxLength={15} value={draft.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} />
          </div>
          {draft.type !== "godown" && (
            <div>
              <label className="label" htmlFor="loc-prefix">Invoice prefix</label>
              <input id="loc-prefix" className="field code uppercase" maxLength={10} placeholder={`${draft.code}-`} value={draft.invoicePrefix}
                onChange={(e) => set("invoicePrefix", e.target.value.toUpperCase())} />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="code text-xs text-gold">{draft.type.toUpperCase()} · {draft.code}</p>
          <p className="display mt-1 text-2xl">{draft.name}</p>
          <p className="text-sm text-ink-soft">{[draft.address, draft.city, draft.phone].filter(Boolean).join(" · ") || "No address yet"}</p>
          <ul className="mt-4 space-y-1 text-sm">
            <li>✓ Own inventory location</li>
            {draft.type !== "godown" && <li>✓ Billing counter with invoices <span className="code">{prefix}00001</span> onwards</li>}
            <li>✓ Appears in transfer destinations and reports</li>
          </ul>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-md bg-madder-wash px-3 py-2 text-sm text-madder">{error}</p>}

      <div className="mt-6 flex justify-between">
        <button className="btn btn-ghost" onClick={step === 0 ? onClose : () => setStep(step - 1)}>{step === 0 ? "Cancel" : "Back"}</button>
        {step < 2 ? (
          <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</button>
        ) : (
          <button className="btn btn-gold" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create location"}</button>
        )}
      </div>
    </Modal>
  );
}
