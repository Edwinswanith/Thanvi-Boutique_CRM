"use client";

import { useState } from "react";
import { Notice, StatusBadge } from "@/components/admin/ui";
import { GST_RATES } from "@/lib/gst/rates";
import { api } from "@/lib/http";
import type { TaxRuleView } from "@/server/services/taxSettings";

interface Props {
  initial: TaxRuleView[];
  editable: boolean;
  canCreate: boolean;
}

/** Editing works in rupees; the API converts slab limits to paise. */
interface Draft {
  id: string | null;
  name: string;
  hsn: string;
  slabs: { upTo: string; rate: number }[];
  note: string;
  status: "draft" | "approved";
  active: boolean;
}

const toDraft = (r?: TaxRuleView): Draft => ({
  id: r?.id ?? null,
  name: r?.name ?? "",
  hsn: r?.hsnPrefixes.join(", ") ?? "",
  slabs: r?.slabs.map((s) => ({ upTo: s.upTo === null ? "" : String(s.upTo / 100), rate: s.rate })) ?? [{ upTo: "", rate: 5 }],
  note: r?.note ?? "",
  status: r?.status ?? "draft",
  active: r?.active ?? true,
});

const describe = (r: TaxRuleView) =>
  r.slabs.map((s) => (s.upTo === null ? `${r.slabs.length > 1 ? "above: " : ""}${s.rate}%` : `≤ ₹${(s.upTo / 100).toLocaleString("en-IN")}: ${s.rate}%`)).join(" · ");

export function TaxRulesEditor({ initial, editable, canCreate }: Props) {
  const [rules, setRules] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    setError(null);
    const body = {
      name: draft.name,
      hsnPrefixes: draft.hsn.split(/[\s,]+/).filter(Boolean),
      slabs: draft.slabs.map((s) => ({ upTo: s.upTo === "" ? null : Number(s.upTo), rate: Number(s.rate) })),
      note: draft.note,
      status: draft.status,
      active: draft.active,
    };
    try {
      const saved = await api<TaxRuleView>(draft.id ? `/api/tax-rules/${draft.id}` : "/api/tax-rules", { method: draft.id ? "PATCH" : "POST", body });
      setRules((prev) => (draft.id ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]));
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  }

  const setSlab = (i: number, patch: Partial<Draft["slabs"][number]>) =>
    setDraft((d) => d && { ...d, slabs: d.slabs.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <section className="rise rise-1 mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="display text-2xl">GST rules</h2>
        {canCreate && !draft && <button className="btn btn-ghost" onClick={() => setDraft(toDraft())}>+ Add rule</button>}
      </div>
      <div className="panel divide-y divide-line">
        {rules.map((r) => (
          <div key={r.id} className={`grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] ${r.active ? "" : "opacity-50"}`}>
            <div>
              <p className="font-semibold">{r.name} <StatusBadge status={r.status === "approved" ? "approved" : "requested"} /></p>
              <p className="text-sm">HSN <span className="code">{r.hsnPrefixes.join(", ")}</span> → <span className="code">{describe(r)}</span></p>
              {r.note && <p className="text-xs text-ink-soft">{r.note}</p>}
            </div>
            {editable && <button className="self-center text-sm font-semibold text-ink-2 hover:underline" onClick={() => setDraft(toDraft(r))}>Edit</button>}
          </div>
        ))}
      </div>

      {draft && (
        <div className="panel mt-4 space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="tr-name">Name</label><input id="tr-name" className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="tr-hsn">HSN prefixes (comma separated)</label><input id="tr-hsn" className="field code" value={draft.hsn} onChange={(e) => setDraft({ ...draft, hsn: e.target.value })} placeholder="5007, 52, 54" /></div>
          </div>
          <div>
            <p className="label">Slabs — taxable value per piece</p>
            {draft.slabs.map((s, i) => (
              <div key={i} className="mb-2 flex items-center gap-2 text-sm">
                <span className="w-16 text-ink-soft">{s.upTo === "" ? "Above" : "Up to ₹"}</span>
                <input aria-label="Upper limit in rupees" className="field code w-32" type="number" min={0} value={s.upTo} placeholder="no limit" onChange={(e) => setSlab(i, { upTo: e.target.value })} />
                <select aria-label="GST rate" className="field code w-24" value={s.rate} onChange={(e) => setSlab(i, { rate: Number(e.target.value) })}>
                  {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
                <button type="button" aria-label="Remove slab" className="text-ink-soft" disabled={draft.slabs.length === 1} onClick={() => setDraft({ ...draft, slabs: draft.slabs.filter((_, j) => j !== i) })}>×</button>
              </div>
            ))}
            <button type="button" className="text-sm font-semibold text-gold hover:underline" onClick={() => setDraft({ ...draft, slabs: [{ upTo: "1000", rate: 5 }, ...draft.slabs] })}>+ Add lower slab</button>
            <p className="mt-1 text-xs text-ink-soft">Leave exactly one slab with no limit. Slabs apply to the price after discounts.</p>
          </div>
          <div><label className="label" htmlFor="tr-note">Note</label><input id="tr-note" className="field" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.status === "approved"} onChange={(e) => setDraft({ ...draft, status: e.target.checked ? "approved" : "draft" })} /> Confirmed by CA</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
          </div>
          {error && <Notice kind="err">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save rule</button>
          </div>
        </div>
      )}
    </section>
  );
}
