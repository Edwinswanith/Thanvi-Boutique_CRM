import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";
import { StorageManager } from "./StorageManager";

export const metadata: Metadata = { title: "Storage bins" };

export default async function StoragePage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { actor, allowed } = await pageActor("inventory.view");
  if (!allowed) return <Forbidden />;
  const locations = await myLocations(actor, ["godown", "store"]);
  const wanted = (await searchParams).location;
  return (
    <>
      <PageHeader eyebrow="Inventory · Storage" title="Storage bins" description="Map each godown and store into racks and shelves. Every piece is put into a bin, so a scan says exactly where to walk." />
      <StorageManager locations={locations} initialLocationId={locations.some((l) => l.id === wanted) ? wanted! : (locations[0]?.id ?? "")} canEdit={can(actor, "inventory.create")} />
    </>
  );
}
