import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import Link from "next/link";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listVendors } from "@/server/services/vendors";
import { VendorsManager } from "./VendorsManager";

export const metadata: Metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const { actor, allowed } = await pageActor("vendors.view");
  if (!allowed) return <Forbidden />;
  return (
    <>
      <PageHeader title="Vendors" description="Find suppliers and the bills linked to their deliveries." actions={
        can(actor, "payables.view") && <Link href="/admin/payables" className="btn btn-ghost">Vendor dues</Link>
      } />
      <VendorsManager initial={await listVendors()} canCreate={can(actor, "vendors.create")} showBills={can(actor, "payables.view")} />
    </>
  );
}
