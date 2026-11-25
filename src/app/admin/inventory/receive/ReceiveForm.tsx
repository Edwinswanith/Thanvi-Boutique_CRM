"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Notice } from "@/components/admin/ui";
import { LABELS_PER_SHEET } from "@/lib/code39";
import { api } from "@/lib/http";
import type { ReceiptResult } from "@/server/services/receiving";
import type { LocationOption } from "@/server/services/myLocations";
import { PhotoPicker } from "./PhotoPicker";

interface VendorOption { id: string; code: string; name: string }
interface Props {
  vendors: VendorOption[];
  locations: LocationOption[];
  initialLocationId: string;
  canAddVendor: boolean;
  showCost: boolean;
}

const CATEGORIES = ["Silk saree", "Cotton saree", "Fancy saree", "Designer saree", "Blouse", "Readymade", "Dress material", "Accessories"];

export function ReceiveForm({ vendors: initialVendors, locations, initialLocationId, canAddVendor, showCost }: Props) {
  const [vendors, setVendors] = useState(initialVendors);
  const [vendorId, setVendorId] = useState(initialVendors[0]?.id ?? "");
  const [locationId, setLocationId] = useState(initialLocationId);
  const [bins, setBins] = useState<{ id: string; code: string }[]>([]);
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [existing, setExisting] = useState(false);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!locationId) return;
    api<{ id: string; code: string }[]>(`/api/bins?locationId=${locationId}`).then(setBins).catch(() => setBins([]));
  }, [locationId]);

  async function addVendor() {
    const name = window.prompt("New vendor name");
    if (!name?.trim()) return;
    try {
      const v = await api<VendorOption>("/api/vendors", { method: "POST", body: { name } });
      setVendors((prev) => [...prev, v]);
      setVendorId(v.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add vendor");
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const num = (k: string) => (f.get(k) === "" || f.get(k) === null ? null : Number(f.get(k)));
    setBusy(true);
    setError(null);
    try {
      const res = await api<ReceiptResult>("/api/inventory/receive", {
        method: "POST",
        body: {
          vendorId, locationId, binId: f.get("binId") || null,
          costPrice: showCost ? num("costPrice") : null, quantity: num("quantity"), description: f.get("description"),
          ...(existing ? { existingSku: f.get("existingSku") } : {
            photoIds, name: f.get("name"), category: f.get("category"), hsn: f.get("hsn"),
            mrp: num("mrp"), color: f.get("color"), fabric: f.get("fabric"),
          }),
        },
      });
      setResult(res);
      setPhotoIds([]);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not receive stock");
    } finally {
      setBusy(false);
    }
  }

  if (!locations.length) return <Notice kind="warn">You are not assigned to any godown or store. Ask the Super Admin to add one.</Notice>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form method="post" action="/admin/inventory/receive" onSubmit={submit} className="panel rise rise-1 space-y-5 p-6">
        <div>
          <label className="label" htmlFor="receipt-product-type">Product type</label>
          <select id="receipt-product-type" className="field" value={existing ? "existing" : "new"} onChange={(e) => setExisting(e.target.value === "existing")} disabled={busy}>
            <option value="new">New product</option>
            <option value="existing">Restock existing SKU</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="r-vendor">Vendor</label>
            <div className="flex gap-2">
              <select id="r-vendor" className="field" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
                {!vendors.length && <option value="">Add a vendor first</option>}
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.code} · {v.name}</option>)}
              </select>
              {canAddVendor && <button type="button" className="btn btn-ghost" onClick={addVendor} aria-label="Add vendor">+</button>}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="r-loc">Receive at</label>
            <select id="r-loc" className="field" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
            </select>
          </div>
        </div>

        {!existing && <PhotoPicker photoIds={photoIds} onChange={setPhotoIds} />}

        <div className="grid gap-4 sm:grid-cols-2">
          {existing ? <Field id="existingSku" label="Existing product SKU" placeholder="TB1000" required maxLength={40} mono /> : <>
          <Field id="name" label="Product name" placeholder="Kanchipuram silk, temple border" required />
          <div>
            <label className="label" htmlFor="r-category">Category</label>
            <input id="r-category" name="category" list="categories" className="field" required minLength={2} />
            <datalist id="categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <Field id="hsn" label="HSN code" placeholder="5007" required pattern="\d{4,8}" mono />
          <Field id="mrp" label="MRP per piece (₹)" type="number" min={1} step="0.01" required mono />
          <Field id="color" label="Colour" />
          <Field id="fabric" label="Fabric" />
          </>}
          <Field id="quantity" label="Pieces received" type="number" min={1} max={500} defaultValue="1" required mono />
          {showCost && <Field id="costPrice" label="Purchase price (₹) — confidential" type="number" min={0} step="0.01" mono />}
        </div>
        <div>
          <label className="label" htmlFor="r-bin">Put away into bin</label>
          <select id="r-bin" name="binId" className="field code">
            <option value="">— Not shelved yet —</option>
            {bins.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
          </select>
          {!bins.length && <p className="mt-1 text-xs text-ink-soft">No bins here yet. <Link className="underline" href="/admin/inventory/storage">Set up racks & shelves</Link>.</p>}
        </div>
        <div>
          <label className="label" htmlFor="r-description">Notes</label>
          <textarea id="r-description" name="description" rows={2} className="field" />
        </div>
        {error && <Notice kind="err">{error}</Notice>}
        <button type="submit" className="btn btn-gold w-full py-3" disabled={busy || !ready || !vendorId}>{busy ? "Receiving…" : "Receive & generate codes"}</button>
      </form>

      <aside className="rise rise-2">
        {result ? (
          <div className="panel overflow-hidden">
            <div className="zari h-1.5" aria-hidden />
            <div className="p-5">
              <p className="code text-xs text-gold">{result.receiptRef}</p>
              <p className="display text-2xl">SKU {result.sku}</p>
              <p className="text-sm text-ink-soft">{result.codes.length} piece(s) received</p>
              <ul aria-label="Received codes" className="code mt-3 max-h-56 space-y-0.5 overflow-y-auto text-sm">{result.codes.map((c) => <li key={c}>{c}</li>)}</ul>
              {Array.from({ length: Math.ceil(result.codes.length / LABELS_PER_SHEET) }, (_, index) => {
                const start = index * LABELS_PER_SHEET;
                const codes = result.codes.slice(start, start + LABELS_PER_SHEET);
                return (
                  <Link key={start} className="btn btn-primary mt-4 w-full" href={`/admin/inventory/labels?codes=${encodeURIComponent(codes.join(","))}`} target="_blank">
                    {result.codes.length <= LABELS_PER_SHEET ? "Print barcode labels" : `Print barcode labels ${start + 1}–${start + codes.length}`}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line-strong p-5 text-sm text-ink-soft">
            After receiving, the SKU and each new piece&apos;s code (e.g. <span className="code">TB1000-001</span>) appear here, ready to print as Code 39 labels.
          </div>
        )}
      </aside>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  mono?: boolean;
}

function Field({ id, label, mono, ...rest }: FieldProps) {
  return (
    <div>
      <label className="label" htmlFor={`r-${id}`}>{label}</label>
      <input id={`r-${id}`} name={id} className={`field ${mono ? "code" : ""}`} {...rest} />
    </div>
  );
}
