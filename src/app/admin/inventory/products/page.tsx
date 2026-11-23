import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { SubNav } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { pageActor } from "@/server/page";
import { listProducts } from "@/server/services/stock";
import { INVENTORY_TABS } from "../tabs";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { actor, allowed } = await pageActor("products.view");
  if (!allowed) return <Forbidden />;
  const q = (await searchParams).q ?? "";
  const products = await listProducts(actor, q);
  const showCost = actor.role.confidential;
  return (
    <>
      <PageHeader eyebrow="Inventory · Catalogue" title="Products" description="Every SKU received, with how many pieces are available and sold at your locations." />
      <SubNav tabs={INVENTORY_TABS} />
      <form className="rise mb-4 flex gap-2" action="/admin/inventory/products">
        <input name="q" defaultValue={q} className="field max-w-sm" placeholder="Search SKU, name or category" aria-label="Search products" />
        <button className="btn btn-ghost">Search</button>
      </form>
      <div className="panel rise rise-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">HSN</th>
              <th className="px-3 py-3 text-right font-semibold">MRP</th>
              {showCost && <th className="px-3 py-3 text-right font-semibold">Cost</th>}
              <th className="px-3 py-3 text-right font-semibold">Available</th>
              <th className="px-5 py-3 text-right font-semibold">Sold</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-gold-wash">
                      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo */}
                      {p.photoId && <img src={`/api/uploads/${p.photoId}`} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-soft"><span className="code text-gold">{p.sku}</span> · {p.category}</p>
                    </div>
                  </div>
                </td>
                <td className="code px-3">{p.hsn}</td>
                <td className="code px-3 text-right">{formatINR(p.mrp)}</td>
                {showCost && <td className="code px-3 text-right">{p.costPrice === null ? "—" : formatINR(p.costPrice)}</td>}
                <td className="code px-3 text-right">{p.available}</td>
                <td className="code px-5 text-right">{p.sold}</td>
              </tr>
            ))}
            {!products.length && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-soft">No products yet. <Link className="underline" href="/admin/inventory/receive">Receive your first stock</Link>.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
