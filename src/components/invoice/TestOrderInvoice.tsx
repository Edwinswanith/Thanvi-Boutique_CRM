import { PrintButton } from "@/app/admin/inventory/labels/PrintButton";
import { formatINR } from "@/lib/money";
import type { CheckoutQuote } from "@/lib/storefront/checkout";
import { CheckoutTotals } from "@/components/shop/CheckoutTotals";

interface InvoiceProps {
  order: {
    number: string;
    status?: string;
    paymentStatus: "test_paid" | "pending";
    createdAt: Date;
    invoiceSeller?: { name?: string | null; address?: string | null; gstin?: string | null } | null;
    customer?: { name?: string | null; address?: string | null; city?: string | null; state?: string | null; postalCode?: string | null } | null;
    lines: Array<{ slug: string; title: string; quantity: number; hsn?: string | null; gstRate?: number | null; total?: number | null }>;
  };
  quote: CheckoutQuote;
}

export function TestOrderInvoice({ order, quote }: InvoiceProps) {
  const seller = order.invoiceSeller;
  const customer = order.customer;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <style>{`@media print { body * { visibility: hidden } .print-test-invoice, .print-test-invoice * { visibility: visible } .print-test-invoice { position: absolute; inset: 0; width: 100%; box-shadow: none } }`}</style>
      <div className="mb-4 flex justify-end"><PrintButton label="Print test invoice" /></div>
      <article className="print-test-invoice panel bg-white p-6 text-ink sm:p-8">
        <h1 className="display text-3xl">Test invoice</h1>
        <p className="mt-1 text-sm">For testing only. This document cannot be used to claim tax credit.</p>
        <p className="mt-3 break-all font-semibold">{order.number}</p>
        <p>{order.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · {order.status === "cancelled" ? "Cancelled" : order.paymentStatus === "test_paid" ? "Dummy payment recorded" : "Cash on delivery pending"}</p>
        <div className="mt-5 grid gap-4 border-y border-line py-4 sm:grid-cols-2">
          <div><p className="font-semibold">Seller</p><p>{seller?.name}</p><p>{seller?.address}</p><p>GSTIN {seller?.gstin || "unconfigured"}</p></div>
          <div><p className="font-semibold">Ship to</p><p>{customer?.name}</p><p>{customer?.address}</p><p>{[customer?.city, customer?.state, customer?.postalCode].filter(Boolean).join(", ")}</p></div>
        </div>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-line">
            <tr>{["Item", "HSN", "Qty", "GST rate", "With GST"].map((heading) => <th key={heading} scope="col" className="p-2">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {order.lines.map((line) => <tr key={line.slug} className="border-b border-line"><td className="p-2">{line.title}</td><td className="p-2">{line.hsn}</td><td className="p-2">{line.quantity}</td><td className="p-2">{line.gstRate}%</td><td className="p-2">{formatINR(line.total ?? 0)}</td></tr>)}
          </tbody>
        </table>
        <CheckoutTotals quote={quote} />
      </article>
    </div>
  );
}
