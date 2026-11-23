import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { SubNav } from "@/components/admin/ui";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listVendors } from "@/server/services/vendors";
import { INVENTORY_TABS } from "../tabs";
import { VendorsManager } from "./VendorsManager";

export const metadata: Metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const { actor, allowed } = await pageActor("vendors.view");
  if (!allowed) return <Forbidden />;
  return (
    <>
      <PageHeader eyebrow="Inventory · Suppliers" title="Vendors" description="Each vendor gets a system ID (XY1, XY2 …) that stays on every piece they supply." />
      <SubNav tabs={INVENTORY_TABS} />
      <VendorsManager initial={await listVendors()} canCreate={can(actor, "vendors.create")} />
    </>
  );
}
