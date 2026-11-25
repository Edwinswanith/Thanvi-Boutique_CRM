import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";
import { listVendors } from "@/server/services/vendors";
import { ReceiveForm } from "./ReceiveForm";

export const metadata: Metadata = { title: "Receive stock" };

export default async function ReceivePage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { actor, allowed } = await pageActor("inventory.create");
  if (!allowed) return <Forbidden />;
  const [assigned, params] = await Promise.all([myLocations(actor, ["godown", "store"]), searchParams]);
  const locations = assigned.filter((location) => location.acceptsVendorStock || isOwnerAdmin(actor.role))
    .sort((a, b) => Number(b.acceptsVendorStock) - Number(a.acceptsVendorStock));
  if (!locations.length) return <Forbidden />;
  const preferred = locations.find((location) => location.id === params.location)?.id ?? locations[0].id;
  const vendors = await listVendors();
  return (
    <>
      <PageHeader title="Receive stock" description="Verify a vendor delivery, select or create a SKU, then print one label per piece." />
      <ReceiveForm
        vendors={vendors.filter((v) => v.active).map((v) => ({ id: v.id, code: v.code, name: v.name }))}
        locations={locations}
        initialLocationId={preferred}
        canAddVendor={can(actor, "vendors.create")}
        showCost={actor.role.confidential}
      />
    </>
  );
}
