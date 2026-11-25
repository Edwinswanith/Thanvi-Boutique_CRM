import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { formatCompactINR, formatINR } from "@/lib/money";
import { BILL_FILTERS, type BillFilter } from "@/lib/validation/payables";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listBills, payablesSummary, vendorDues } from "@/server/services/payables";
import { BillsTable } from "./BillsTable";

export const metadata: Metadata = { title: "Vendor dues" };

const TABS: Array<[string, BillFilter | undefined]> = [["To pay", "open"], ["Overdue", "overdue"], ["Amount needed", "draft"], ["Paid", "paid"], ["All", undefined]];

function href(status: BillFilter | undefined, vendorId: string | undefined): string {
  const qs = new URLSearchParams({ ...(status ? { status } : { status: "all" }), ...(vendorId ? { vendor: vendorId } : {}) });
  return `/admin/payables?${qs.toString()}`;
}

export default async function PayablesPage({ searchParams }: { searchParams: Promise<{ status?: string; vendor?: string }> }) {
  const { actor, allowed } = await pageActor("payables.view");
  if (!allowed) return <Forbidden />;
  const sp = await searchParams;
  const status = sp.status === "all" ? undefined : ((BILL_FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as BillFilter) : "open");
  const vendorId = /^[a-f0-9]{24}$/i.test(sp.vendor ?? "") ? sp.vendor : undefined;
  const [summary, dues, bills] = await Promise.all([payablesSummary(actor), vendorDues(actor), listBills(actor, { status, vendorId })]);
  const vendor = dues.find((d) => d.vendorId === vendorId);
  const tiles = [
    { label: "To pay vendors", value: formatCompactINR(summary.pending), sub: `${summary.openBills} open bill${summary.openBills === 1 ? "" : "s"}` },
    { label: "Overdue", value: formatCompactINR(summary.overdue), sub: summary.overdueBills ? `${summary.overdueBills} bill${summary.overdueBills === 1 ? "" : "s"} past the due date` : "Nothing is late", alert: summary.overdue > 0 },
    { label: "Paid in the last 30 days", value: formatCompactINR(summary.paidLast30), sub: "All payment modes" },
    { label: "Amount needed", value: String(summary.drafts), sub: summary.drafts ? "Deliveries without a cost price" : "Every delivery has an amount" },
  ];

  return (
    <>
      <PageHeader title="Vendor dues" description="Record payments and check what’s pending or overdue." actions={
        can(actor, "vendors.view") && <Link href="/admin/inventory/vendors" className="btn btn-ghost">Vendor directory</Link>
      } />
      {summary.hasDemo && <p role="status" className="rise mb-6 rounded-md border border-gold/40 bg-gold-wash px-4 py-2.5 text-sm"><strong>Sample data.</strong> Demo vendors and bills are included so you can try this screen. Remove them before going live.</p>}

      <section className="rise mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-card px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{t.label}</p>
            <p className={`display mt-2 text-3xl font-light ${t.alert ? "text-madder" : ""}`}>{t.alert && <span aria-hidden className="mr-1 text-xl">!</span>}{t.value}</p>
            <p className="mt-1 text-xs text-ink-soft">{t.sub}</p>
          </div>
        ))}
      </section>

      <section className="panel rise rise-1 mb-6 overflow-x-auto">
        <h2 className="display px-5 pt-5 text-lg">By vendor</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-2.5 font-semibold">Vendor</th><th className="px-3 py-2.5 text-right font-semibold">Billed</th>
              <th className="px-3 py-2.5 text-right font-semibold">Paid</th><th className="px-3 py-2.5 text-right font-semibold">Pending</th>
              <th className="px-5 py-2.5 text-right font-semibold">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {dues.map((d) => (
              <tr key={d.vendorId} className={`border-b border-line/70 last:border-0 ${d.vendorId === vendorId ? "bg-gold-wash/50" : ""}`}>
                <td className="px-5 py-3">
                  <Link href={href(status, d.vendorId === vendorId ? undefined : d.vendorId)} className="link-grow font-semibold">{d.vendorName}</Link>
                  <span className="code ml-2 text-xs text-gold">{d.vendorCode}</span>
                </td>
                <td className="code px-3 py-3 text-right">{formatINR(d.billed)}</td>
                <td className="code px-3 py-3 text-right text-ink-soft">{formatINR(d.paid)}</td>
                <td className="code px-3 py-3 text-right font-semibold">{formatINR(d.pending)}</td>
                <td className={`code px-5 py-3 text-right ${d.overdue ? "font-semibold text-madder" : "text-ink-soft"}`}>{d.overdue ? formatINR(d.overdue) : "—"}</td>
              </tr>
            ))}
            {!dues.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-soft">No vendor bills yet. They appear here as soon as stock is received.</td></tr>}
          </tbody>
        </table>
      </section>

      <div className="rise rise-2 mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(([label, s]) => (
          <Link key={label} href={href(s, vendorId)} aria-current={status === s ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${status === s ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}>{label}</Link>
        ))}
        {vendor && <Link href={href(status, undefined)} className="ml-auto rounded-full border border-gold bg-gold-wash px-3 py-1 text-xs font-semibold">{vendor.vendorName} ×</Link>}
      </div>
      <BillsTable bills={bills} canPay={can(actor, "payables.create")} canEdit={can(actor, "payables.edit")} />
    </>
  );
}
