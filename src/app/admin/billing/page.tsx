import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { Notice } from "@/components/admin/ui";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";
import { getInvoiceSettings, listTaxRules } from "@/server/services/taxSettings";
import { Pos } from "./Pos";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { actor, allowed } = await pageActor("sales.create");
  if (!allowed) return <Forbidden />;
  const [locations, settings, rules, params] = await Promise.all([myLocations(actor, ["store", "online"]), getInvoiceSettings(), listTaxRules(), searchParams]);
  // Physical stores first so the POS opens on a counter, not the online channel.
  const stores = [...locations.filter((l) => l.type === "store"), ...locations.filter((l) => l.type !== "store")];
  const drafts = rules.filter((r) => r.active && r.status === "draft").length;
  return (
    <>
      <PageHeader title="Billing" description="Scan each piece, check the total and record payment." />
      {drafts > 0 && (
        <div className="rise mb-4">
          <Notice kind="warn">{drafts} GST rule(s) are still drafts awaiting CA approval. Bills use them as configured; confirm rates before go-live.</Notice>
        </div>
      )}
      {stores.length ? <Pos stores={stores} initialStoreId={stores.find((store) => store.id === params.location)?.id ?? stores[0].id} pricesIncludeTax={settings.pricesIncludeTax} /> : <Notice kind="warn">Ask your administrator to assign you to a shop.</Notice>}
    </>
  );
}
