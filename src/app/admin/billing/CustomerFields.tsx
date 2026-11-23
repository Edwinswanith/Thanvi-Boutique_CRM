"use client";

import { GST_STATES } from "@/lib/gst/states";

export interface Customer {
  name: string;
  phone: string;
  gstin: string;
  address: string;
  stateCode: string;
}

export const EMPTY_CUSTOMER: Customer = { name: "", phone: "", gstin: "", address: "", stateCode: "" };

/** Optional for walk-ins; GSTIN (B2B) or another state switches the bill to IGST. */
export function CustomerFields({ value, onChange }: { value: Customer; onChange: (c: Customer) => void }) {
  const set = (k: keyof Customer, v: string) => onChange({ ...value, [k]: v });
  return (
    <details className="panel rise rise-3 p-4" open={Boolean(value.name || value.phone)}>
      <summary className="cursor-pointer text-sm font-semibold">Customer details <span className="font-normal text-ink-soft">(optional · needed for B2B / out-of-state)</span></summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-name">Name</label><input id="c-name" className="field" value={value.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><label className="label" htmlFor="c-phone">Phone</label><input id="c-phone" className="field" inputMode="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><label className="label" htmlFor="c-gstin">GSTIN (business customer)</label><input id="c-gstin" className="field code uppercase" maxLength={15} value={value.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} /></div>
        <div>
          <label className="label" htmlFor="c-state">Place of supply</label>
          <select id="c-state" className="field" value={value.stateCode} onChange={(e) => set("stateCode", e.target.value)}>
            <option value="">Same as store (walk-in)</option>
            {GST_STATES.map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label" htmlFor="c-address">Address</label><input id="c-address" className="field" value={value.address} onChange={(e) => set("address", e.target.value)} /></div>
      </div>
    </details>
  );
}
