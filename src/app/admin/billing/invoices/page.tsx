import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { can } from "@/server/actor";
import type { InvoiceStatus } from "@/models/Invoice";
import { pageActor } from "@/server/page";
import { listInvoices } from "@/server/services/invoiceLifecycle";

export const metadata: Metadata = { title: "Invoices" };

const FILTERS: Array<[string, InvoiceStatus | undefined]> = [["All", undefined], ["Pending payment", "open"], ["Closed", "closed"], ["Cancelled", "cancelled"]];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { actor, allowed } = await pageActor("sales.view");
  if (!allowed) return <Forbidden />;
  const sp = await searchParams;
  const status = FILTERS.find(([, s]) => s === sp.status)?.[1];
  const rows = await listInvoices(actor, { status, q: sp.q });
  const total = rows.filter((r) => r.status === "closed").reduce((a, r) => a + r.grandTotal, 0);

  return (
    <>
      <PageHeader title={actor.role.slug === "salesperson" ? "My invoices" : "Invoices"} description={`${rows.length} invoice(s) shown · ${formatINR(total)} collected`} actions={can(actor, "sales.create") && <Link className="btn btn-gold" href="/admin/billing">New bill</Link>} />
      <div className="rise mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([label, s]) => (
          <Link key={label} href={`/admin/billing/invoices${s ? `?status=${s}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === s ? "border-ink bg-ink text-paper" : "border-line-strong"}`}>{label}</Link>
        ))}
        <form className="ml-auto flex gap-2" action="/admin/billing/invoices">
          <input name="q" defaultValue={sp.q} className="field w-56" placeholder="Invoice no. or phone" aria-label="Search invoices" />
        </form>
      </div>
      <div className="panel rise rise-1 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3">Invoice</th><th className="px-3 py-3">Store</th><th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Paid by</th><th className="px-3 py-3 text-right">Amount</th><th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/70 last:border-0 hover:bg-gold-wash/30">
                <td className="px-5 py-3"><Link className="code font-semibold hover:underline" href={`/admin/billing/invoices/${r.id}`}>{r.number}</Link><p className="text-xs text-ink-soft">{new Date(r.createdAt).toLocaleString("en-IN")}</p></td>
                <td className="code px-3">{r.store}</td>
                <td className="px-3">{r.customer}<span className="ml-1 text-xs text-ink-soft">{r.channel !== "store" ? `· ${r.channel}` : ""}</span></td>
                <td className="px-3 text-xs uppercase">{r.modes.join(", ") || "—"}</td>
                <td className="code px-3 text-right">{formatINR(r.grandTotal)}</td>
                <td className="px-5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-soft">No invoices.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
