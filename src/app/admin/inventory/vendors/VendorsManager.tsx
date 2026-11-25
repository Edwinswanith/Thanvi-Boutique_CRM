"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Modal } from "@/components/admin/Modal";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";
import type { VendorView } from "@/server/services/vendors";

export function VendorsManager({ initial, canCreate, showBills }: { initial: VendorView[]; canCreate: boolean; showBills: boolean }) {
  const [vendors, setVendors] = useState(initial);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setError(null);
    try {
      const v = await api<VendorView>("/api/vendors", { method: "POST", body: f });
      setVendors((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add vendor");
    }
  }

  return (
    <div className="rise rise-1">
      {canCreate && <div className="mb-4 flex justify-end"><button className="btn btn-gold" onClick={() => setOpen(true)}>+ Add vendor</button></div>}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3 font-semibold">ID</th><th className="px-3 py-3 font-semibold">Vendor</th>
              <th className="px-3 py-3 font-semibold">Contact</th><th className="px-5 py-3 font-semibold">GSTIN</th>
              {showBills && <th className="px-3 py-3 font-semibold">Bills</th>}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-b border-line/70 last:border-0">
                <td className="code px-5 py-3 text-gold">{v.code}</td>
                <td className="px-3 py-3 font-semibold">{v.name}</td>
                <td className="px-3 py-3 text-ink-soft">{[v.contactName, v.phone].filter(Boolean).join(" · ") || "—"}</td>
                <td className="code px-5 py-3">{v.gstin || "—"}</td>
                {showBills && <td className="px-3 py-3"><Link className="underline" href={`/admin/payables?status=all&vendor=${v.id}`}>View bills</Link></td>}
              </tr>
            ))}
            {!vendors.length && <tr><td colSpan={showBills ? 5 : 4} className="px-5 py-10 text-center text-ink-soft">No vendors yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <Modal title="Add vendor" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {[["name", "Vendor name", true], ["contactName", "Contact person"], ["phone", "Phone"], ["email", "Email"], ["gstin", "GSTIN"], ["address", "Address"]].map(([name, label, required]) => (
              <div key={String(name)} className={name === "address" || name === "name" ? "sm:col-span-2" : ""}>
                <label className="label" htmlFor={`v-${name}`}>{label}</label>
                <input id={`v-${name}`} name={String(name)} required={Boolean(required)} className={`field ${name === "gstin" ? "code uppercase" : ""}`} />
              </div>
            ))}
            {error && <div className="sm:col-span-2"><Notice kind="err">{error}</Notice></div>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary">Add vendor</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
