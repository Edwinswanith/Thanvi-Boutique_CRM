"use client";

import { useState } from "react";
import { Notice } from "@/components/admin/ui";
import { InvoiceDocument, type InvoiceData } from "@/components/invoice/InvoiceDocument";
import { GST_STATES } from "@/lib/gst/states";
import { api } from "@/lib/http";
import type { InvoiceSettingsView } from "@/server/services/taxSettings";

const SAMPLE = (s: InvoiceSettingsView): InvoiceData => ({
  number: "SH1-00042",
  createdAt: new Date("2026-11-19T11:30:00+05:30"),
  status: "closed",
  supplyType: "intra",
  placeOfSupply: s.stateCode,
  customer: { name: "Priya Raman", phone: "98xxxxxx10" },
  lines: [
    { code: "TB1000-001", name: "Kanchipuram silk saree", hsn: "5007", mrp: 1_050_000, discount: 105_000, taxable: 900_000, rate: 5, cgst: 22_500, sgst: 22_500, total: 945_000 },
    { code: "TB1012-004", name: "Cotton blouse (readymade)", hsn: "6206", mrp: 120_000, discount: 0, taxable: 114_286, rate: 5, cgst: 2_857, sgst: 2_857, total: 120_000 },
  ],
  totals: { mrp: 1_170_000, discount: 105_000, taxable: 1_014_286, cgst: 25_357, sgst: 25_357, igst: 0, roundOff: 0, grandTotal: 1_065_000 },
  taxBreakup: [{ rate: 5, taxable: 1_014_286, cgst: 25_357, sgst: 25_357, igst: 0 }],
  payments: [{ mode: "upi", amount: 1_065_000, reference: "UPI-2231" }],
  salespersonName: "Lakshmi",
  seller: { ...s, storeName: "Shop 1", storeCode: "SH1", storeAddress: s.address },
});

export function InvoiceSettingsForm({ initial, editable }: { initial: InvoiceSettingsView; editable: boolean }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof InvoiceSettingsView>(k: K, v: InvoiceSettingsView[K]) => setS((p) => ({ ...p, [k]: v }));

  async function save() {
    setMsg(null);
    try {
      setS(await api<InvoiceSettingsView>("/api/settings/invoice", { method: "PUT", body: s }));
      setMsg({ ok: true, text: "Saved. New invoices use these details; past invoices keep theirs." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save" });
    }
  }

  const text = (k: "legalName" | "tradeName" | "phone" | "email" | "gstin" | "title" | "signatureLabel", label: string) => (
    <div><label className="label" htmlFor={`is-${k}`}>{label}</label><input id={`is-${k}`} disabled={!editable} className={`field ${k === "gstin" ? "code uppercase" : ""}`} value={s[k]} onChange={(e) => set(k, k === "gstin" ? e.target.value.toUpperCase() : e.target.value)} /></div>
  );
  const check = (k: "pricesIncludeTax" | "roundToRupee" | "showHsn" | "showSalesperson", label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={s[k]} onChange={(e) => set(k, e.target.checked)} /> {label}</label>
  );

  return (
    <section className="rise rise-2">
      <h2 className="display mb-1 text-2xl">Invoice format</h2>
      <p className="mb-4 text-sm text-ink-soft">When the client&apos;s sample invoice arrives, fill these to match it and check the preview. Layout tweaks beyond this live in the invoice template component.</p>
      <div className="grid gap-6 2xl:grid-cols-[420px_1fr]">
        <div className="panel space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {text("legalName", "Legal name")}{text("tradeName", "Trade name")}
            {text("gstin", "Default GSTIN")}
            <div>
              <label className="label" htmlFor="is-state">Business state</label>
              <select id="is-state" disabled={!editable} className="field" value={s.stateCode} onChange={(e) => set("stateCode", e.target.value)}>
                {GST_STATES.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}
              </select>
            </div>
            {text("phone", "Phone")}{text("email", "Email")}
          </div>
          <div><label className="label" htmlFor="is-address">Address</label><textarea id="is-address" rows={2} disabled={!editable} className="field" value={s.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {text("title", "Invoice title")}
            <div>
              <label className="label" htmlFor="is-template">Template</label>
              <select id="is-template" disabled={!editable} className="field" value={s.template} onChange={(e) => set("template", e.target.value as InvoiceSettingsView["template"])}>
                <option value="classic">Classic (A4)</option><option value="compact">Compact (80 mm thermal)</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {check("pricesIncludeTax", "MRP includes GST")}{check("roundToRupee", "Round total to rupee")}
            {check("showHsn", "Show HSN column")}{check("showSalesperson", "Show salesperson")}
          </div>
          <div><label className="label" htmlFor="is-terms">Terms</label><textarea id="is-terms" rows={2} disabled={!editable} className="field" value={s.terms} onChange={(e) => set("terms", e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="is-footer">Footer</label><input id="is-footer" disabled={!editable} className="field" value={s.footer} onChange={(e) => set("footer", e.target.value)} /></div>
            {text("signatureLabel", "Signature label")}
          </div>
          {msg && <Notice kind={msg.ok ? "ok" : "err"}>{msg.text}</Notice>}
          {editable && <button className="btn btn-primary w-full" onClick={save}>Save invoice settings</button>}
        </div>
        <div className="overflow-x-auto rounded-lg border border-line bg-white p-2">
          <p className="code mb-2 px-2 text-[10px] tracking-[0.2em] text-gold">LIVE PREVIEW · SAMPLE DATA</p>
          <InvoiceDocument invoice={SAMPLE(s)} />
        </div>
      </div>
    </section>
  );
}
