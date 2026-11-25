import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/ui";
import { AppError } from "@/lib/api";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { getStockCount } from "@/server/services/stockCounts";
import { CountActions } from "./CountActions";

export const metadata: Metadata = { title: "Stock count" };

export default async function StockCountPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, allowed } = await pageActor("counts.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  const count = await getStockCount(actor, id).catch((err: unknown) => {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  });
  const approve = can(actor, "counts.approve");
  const edit = can(actor, "counts.edit") && (count.isCreator || approve);
  const differences = [
    { label: "Missing pieces", codes: count.missingCodes },
    { label: "Found pieces", codes: count.foundCodes },
    { label: "Unexpected scans", codes: count.unexpectedCodes },
  ];
  return (
    <>
      <PageHeader title={count.reference} description={[count.locationName, count.sku, count.binCode].filter(Boolean).join(" · ")} actions={<StatusBadge status={count.status} />} />
      <Link className="mb-5 inline-block text-sm underline" href="/admin/inventory/counts">Back to stock counts</Link>
      <div className="panel mb-5 flex flex-wrap gap-x-8 gap-y-2 px-5 py-4 text-sm">
        <p>Expected <strong>{count.expected}</strong></p>
        <p>Saved scans <strong>{count.scanned}</strong></p>
        {count.reviewedBy && <p>Approved by <strong>{count.reviewedBy}</strong></p>}
      </div>
      {count.differences > 0 && (
        <section aria-label="Count differences" className="panel mb-5 space-y-3 p-5 text-sm">
          {differences.filter(({ codes }) => codes.length > 0).map(({ label, codes }) => (
            <div key={label}><p className="font-semibold">{label} ({codes.length})</p><p className="code wrap-break-word">{codes.join(", ")}</p></div>
          ))}
          {count.unexpectedCodes.length > 0 && <p className="text-ink-soft">Check the barcode or location for unexpected pieces. These scans leave stock balances as they are.</p>}
          <p><strong>Reason</strong> {count.reason}</p>
        </section>
      )}
      <CountActions key={count.version} count={count} canEdit={edit} canApprove={approve} />
    </>
  );
}
