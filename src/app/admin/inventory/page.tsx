import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { SubNav } from "@/components/admin/ui";
import { pageActor } from "@/server/page";
import { stockSummary } from "@/server/services/stock";
import { ScanLookup } from "./ScanLookup";
import { INVENTORY_TABS } from "./tabs";

export const metadata: Metadata = { title: "Inventory" };

const COLUMNS = [
  ["available", "Available"],
  ["reserved", "On hold"],
  ["in_transit", "Incoming"],
  ["sold", "Sold"],
  ["damaged", "Damaged"],
] as const;

export default async function InventoryPage() {
  const { actor, allowed } = await pageActor("inventory.view");
  if (!allowed) return <Forbidden />;
  const rows = await stockSummary(actor);
  const total = (k: (typeof COLUMNS)[number][0]) => rows.reduce((a, r) => a + r.counts[k], 0);
  const unshelved = rows.reduce((a, r) => a + r.unshelved, 0);

  return (
    <>
      <PageHeader eyebrow="Operations · Inventory" title="Stock & scan" description="Scan any tag to see the saree, where it sits (location and bin) and everything that has happened to it." />
      <SubNav tabs={INVENTORY_TABS} />

      <section className="panel rise rise-1 mb-8 p-6">
        <p className="display mb-3 text-xl">Where is this piece?</p>
        <ScanLookup />
      </section>

      <section className="rise rise-2 mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          ["Available", total("available")],
          ["Incoming (in transit)", total("in_transit")],
          ["Sold", total("sold")],
          ["Not yet shelved", unshelved],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-4">
            <p className="display text-3xl font-light">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">{label}</p>
          </div>
        ))}
      </section>

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
