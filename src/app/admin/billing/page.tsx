import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { Notice } from "@/components/admin/ui";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";
import { getInvoiceSettings, listTaxRules } from "@/server/services/taxSettings";
import { Pos } from "./Pos";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { actor, allowed } = await pageActor("sales.create");
  if (!allowed) return <Forbidden />;
  const [locations, settings, rules] = await Promise.all([myLocations(actor, ["store", "online"]), getInvoiceSettings(), listTaxRules()]);
  // Physical stores first so the POS opens on a counter, not the online channel.
  const stores = [...locations.filter((l) => l.type === "store"), ...locations.filter((l) => l.type !== "store")];
  const drafts = rules.filter((r) => r.active && r.status === "draft").length;
  return (
    <>
      <PageHeader eyebrow="Operations · Point of sale" title="Billing" description="Scan tags, apply offers, and the GST is worked out on the final selling price. Paying closes the bill and takes the pieces out of stock." />
      {drafts > 0 && (
        <div className="rise mb-4">
          <Notice kind="warn">{drafts} GST rule(s) are still drafts awaiting CA approval. Bills use them as configured; confirm rates before go-live.</Notice>
        </div>
      )}
      {stores.length ? <Pos stores={stores} pricesIncludeTax={settings.pricesIncludeTax} /> : <Notice kind="warn">You are not assigned to a store.</Notice>}
    </>
  );
}
