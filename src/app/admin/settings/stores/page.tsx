import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listLocations } from "@/server/services/locations";
import { StoresManager } from "./StoresManager";

export const metadata: Metadata = { title: "Locations" };

export default async function StoresPage() {
  const { actor, allowed } = await pageActor("system.locations.view");
  if (!allowed) return <Forbidden />;
  const locations = await listLocations();
  return (
    <>
      <PageHeader
        title="Locations"
        description="Manage shops, godowns and online stock locations."
      />
      <StoresManager
        initial={locations}
        canCreate={can(actor, "system.locations.create")}
        canEdit={can(actor, "system.locations.edit")}
      />
    </>
  );
}
