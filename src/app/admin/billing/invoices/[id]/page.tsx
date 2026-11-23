import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden } from "@/components/admin/PageHeader";
import { Notice, StatusBadge } from "@/components/admin/ui";
import { InvoiceDocument, type InvoiceData } from "@/components/invoice/InvoiceDocument";
import { AppError } from "@/lib/api";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { getInvoice } from "@/server/services/invoiceLifecycle";
import { PrintButton } from "../../../inventory/labels/PrintButton";
import { CancelInvoice } from "./CancelInvoice";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ warning?: string }> }) {
  const { actor, allowed } = await pageActor("sales.view");
  if (!allowed) return <Forbidden />;
  let inv;
  try {
    inv = await getInvoice(actor, (await params).id);
  } catch (err) {
    return <div className="panel mx-auto mt-16 max-w-md p-8 text-center"><p className="display text-2xl">{err instanceof AppError ? err.message : "Not found"}</p></div>;
  }
  const { warning } = await searchParams;
  return (
    <div>
      <style>{`@media print { #sidebar, .no-print, nextjs-portal, button[aria-controls="sidebar"] { display:none !important } main { margin:0 !important; padding:0 !important } body::before { display:none } body { background:#fff } .invoice-doc { box-shadow:none !important } }`}</style>
      <div className="no-print rise mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/billing/invoices" className="text-sm text-ink-soft hover:underline">← Invoices</Link>
          <StatusBadge status={inv.status} />
        </div>
        <div className="flex gap-2">
          <Link className="btn btn-ghost" href="/admin/billing">New bill</Link>
          <PrintButton label="Print invoice" />
        </div>
      </div>
      <div className="no-print mb-4 space-y-2">
        {warning && <Notice kind="warn">{warning}</Notice>}
        {inv.status === "open" && inv.razorpay?.shortUrl && (
          <Notice kind="warn">Waiting for payment. Share this link with the customer: <a className="code underline" href={inv.razorpay.shortUrl} target="_blank" rel="noreferrer">{inv.razorpay.shortUrl}</a></Notice>
        )}
        {inv.status === "open" && can(actor, "sales.edit") && <CancelInvoice id={inv.id} />}
        {inv.status === "cancelled" && <Notice kind="err">Cancelled{inv.cancelReason ? `: ${inv.cancelReason}` : ""}. Items were returned to stock.</Notice>}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line shadow-[0_20px_50px_-30px_rgba(37,36,43,.5)]">
        <InvoiceDocument invoice={inv as unknown as InvoiceData} />
      </div>
    </div>
  );
}
