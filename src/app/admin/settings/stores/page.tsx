import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listLocations } from "@/server/services/locations";
import { StoresManager } from "./StoresManager";

export const metadata: Metadata = { title: "Stores & godowns" };

export default async function StoresPage() {
  const { actor, allowed } = await pageActor("system.locations.view");
  if (!allowed) return <Forbidden />;
  const locations = await listLocations();
  return (
    <>
      <PageHeader
        eyebrow="Setup · Locations"
        title="Stores & godowns"
        description="Every place stock can live. A new store gets its own inventory, billing counter and invoice series as soon as it is created."
      />
      <StoresManager
        initial={locations}
        canCreate={can(actor, "system.locations.create")}
        canEdit={can(actor, "system.locations.edit")}
      />
    </>
  );
}
