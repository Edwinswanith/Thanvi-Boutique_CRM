import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { stockSummary } from "@/server/services/stock";
import { ScanLookup } from "./ScanLookup";

export const metadata: Metadata = { title: "Inventory" };

const COLUMNS = [
  ["available", "Available"],
  ["reserved", "On hold"],
  ["in_transit", "Incoming"],
  ["sold", "Sold"],
  ["damaged", "Damaged"],
  ["returned", "Returned"],
  ["missing", "Missing"],
] as const;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { actor, allowed } = await pageActor("inventory.view");
  if (!allowed) return <Forbidden />;
  const [allRows, params] = await Promise.all([stockSummary(actor), searchParams]);
  const selected = allRows.find((row) => row.locationId === params.location);
  const rows = selected ? [selected] : allRows;
  const total = (k: (typeof COLUMNS)[number][0]) => rows.reduce((a, r) => a + r.counts[k], 0);

  return (
    <>
      <PageHeader title="Stock" description="Find a piece by barcode and check stock at your locations." />

      <section className="panel rise rise-1 mb-8 p-6">
        <p className="display mb-3 text-xl">Where is this piece?</p>
        <ScanLookup />
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {allRows.length > 1 && (
          <form action="/admin/inventory" className="flex items-center gap-2">
            <select aria-label="Stock location" name="location" className="field" defaultValue={selected?.locationId ?? ""}>
              <option value="">All assigned locations</option>
              {allRows.map((row) => <option key={row.locationId} value={row.locationId}>{row.name}</option>)}
            </select>
            <button className="btn btn-ghost">Apply</button>
          </form>
        )}
        <div className="flex flex-wrap gap-2">
          {can(actor, "products.view") && <Link className="btn btn-ghost" href="/admin/inventory/products">Stock by product</Link>}
          {rows.some((row) => row.type !== "online") && <Link className="btn btn-ghost" href={selected ? `/admin/inventory/storage?location=${selected.locationId}` : "/admin/inventory/storage"}>Storage bins</Link>}
        </div>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          ["Available", total("available")],
          ["On hand", total("available") + total("reserved") + total("damaged") + total("returned")],
          ["Incoming (in transit)", total("in_transit")],
          ["Sold", total("sold")],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-4">
            <p className="display text-3xl font-light">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</p>
          </div>
        ))}
      </section>
      {!rows.length && <p className="panel mb-4 px-5 py-4 text-sm text-ink-soft">Ask your administrator to assign a stock location.</p>}

      <section className="panel rise rise-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3 font-semibold">Location</th>
              {COLUMNS.map(([, label]) => <th key={label} className="px-3 py-3 text-right font-semibold">{label}</th>)}
              <th className="px-5 py-3 text-right font-semibold">Unshelved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.locationId} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-3">
                  <span className="code mr-2 rounded bg-ink px-1.5 py-0.5 text-[11px] text-paper">{r.code}</span>
                  {r.name}
                  <span className="ml-2 text-xs text-ink-soft">{r.type}</span>
                </td>
                {COLUMNS.map(([k]) => <td key={k} className="code px-3 py-3 text-right">{r.counts[k] || "·"}</td>)}
                <td className="px-5 py-3 text-right">
                  {r.unshelved ? <Link className="code text-madder underline-offset-4 hover:underline" href={`/admin/inventory/storage?location=${r.locationId}`}>{r.unshelved}</Link> : <span className="code">·</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
