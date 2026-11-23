import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { SubNav } from "@/components/admin/ui";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";
import { listVendors } from "@/server/services/vendors";
import { INVENTORY_TABS } from "../tabs";
import { ReceiveForm } from "./ReceiveForm";

export const metadata: Metadata = { title: "Receive stock" };

export default async function ReceivePage() {
  const { actor, allowed } = await pageActor("inventory.create");
  if (!allowed) return <Forbidden />;
  const [vendors, locations] = await Promise.all([listVendors(), myLocations(actor, ["godown", "store"])]);
  return (
    <>
      <PageHeader eyebrow="Inventory · Goods receipt" title="Receive stock" description="Photograph the saree, enter its details once, and every piece gets its own barcode. Put them straight onto a shelf so a scan always finds them." />
      <SubNav tabs={INVENTORY_TABS} />
      <ReceiveForm
        vendors={vendors.filter((v) => v.active).map((v) => ({ id: v.id, code: v.code, name: v.name }))}
        locations={locations}
        canAddVendor={can(actor, "vendors.create")}
        showCost={actor.role.confidential}
      />
    </>
  );
}
