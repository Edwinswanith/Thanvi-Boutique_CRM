import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/ui";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";
import { listStockCounts } from "@/server/services/stockCounts";
import { StartCount } from "./StartCount";

export const metadata: Metadata = { title: "Stock counts" };

export default async function StockCountsPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { actor, allowed } = await pageActor("counts.view");
  if (!allowed) return <Forbidden />;
  const [counts, locations, params] = await Promise.all([listStockCounts(actor), myLocations(actor), searchParams]);
  const selected = locations.find((location) => location.id === params.location);
  return (
    <>
      <PageHeader title="Stock counts" description="Count pieces at a location, then review any difference against the recorded stock." />
      {can(actor, "counts.create") && locations.length > 0 && <StartCount locations={locations} locationId={selected?.id} />}
      <section aria-labelledby="count-history" className="mt-7">
        <h2 id="count-history" className="display mb-3 text-xl">Recent counts</h2>
        <div className="panel divide-y divide-line">
          {counts.map((count) => (
            <Link href={"/admin/inventory/counts/" + count.id} key={count.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-gold-wash/40">
              <div>
                <p className="font-semibold">{count.reference} · {count.locationName}</p>
                <p className="text-sm text-ink-soft">{[count.sku, count.binCode, count.scanned + " scanned"].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {count.differences > 0 && <span>{count.differences} differences</span>}
                <StatusBadge status={count.status} />
              </div>
            </Link>
          ))}
          {counts.length === 0 && <p className="px-5 py-4 text-sm text-ink-soft">No counts at your locations yet.</p>}
        </div>
      </section>
    </>
  );
}
