import type { Metadata } from "next";
import Link from "next/link";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { Filters } from "@/components/admin/dashboard/Filters";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { parseRange } from "@/lib/analytics/periods";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { salesOverview } from "@/server/services/analytics";
import { myLocations } from "@/server/services/myLocations";
import { payablesSummary } from "@/server/services/payables";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; store?: string }> }) {
  const { actor, allowed } = await pageActor("reports.view");
  if (!allowed) return <Forbidden />;
  const [params, locations] = await Promise.all([searchParams, myLocations(actor, ["store", "online"])]);
  const range = parseRange(params.range);
  const locationId = locations.find((location) => location.id === params.store)?.id ?? null;
  const [report, payables] = await Promise.all([
    salesOverview(actor, { range, locationId }),
    can(actor, "payables.view") ? payablesSummary(actor) : null,
  ]);
  return (
    <>
      <PageHeader title="Reports" description={locations.find((location) => location.id === locationId)?.name ?? "All assigned locations"} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Filters range={range} locationId={locationId} locations={locations} />
        {can(actor, "inventory.view") && <Link href="/admin/inventory" className="btn btn-ghost">View stock</Link>}
      </div>
      <Dashboard o={report} payables={payables} />
    </>
  );
}
