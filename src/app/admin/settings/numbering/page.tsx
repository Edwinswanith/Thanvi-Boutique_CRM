import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listSeries } from "@/server/services/numberSeries";
import { NumberingManager } from "./NumberingManager";

export const metadata: Metadata = { title: "SKU & numbering" };

export default async function NumberingPage() {
  const { actor, allowed } = await pageActor("system.numbering.view");
  if (!allowed) return <Forbidden />;
  const series = await listSeries();
  return (
    <>
      <PageHeader
        eyebrow="Setup · Codes"
        title="SKU & numbering"
        description="Choose the prefix and the number each series starts from. Every saree's barcode label uses Code 39, so prefixes are limited to barcode-safe characters."
      />
      <NumberingManager initial={series} canEdit={can(actor, "system.numbering.edit")} />
    </>
  );
}
