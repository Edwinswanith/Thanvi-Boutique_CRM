import Link from "next/link";
import { RANGE_LABELS, weekdayOf } from "@/lib/analytics/periods";
import { formatCompactINR, formatINR } from "@/lib/money";
import type { Overview } from "@/server/services/analytics";
import type { PayablesSummary } from "@/server/services/payables";
import { BarList, Card, Delta, Kpi } from "./parts";
import { SalesChart, type ChartBar } from "./SalesChart";

const CHANNEL_LABELS: Record<string, string> = { store: "Stores (walk-in)", online: "Website", instagram: "Instagram" };
const PAYMENT_LABELS: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", razorpay: "Razorpay (online)" };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CONFIDENCE_TEXT = {
  low: "Early estimate. It gets sharper after a few weeks of billing.",
  medium: "Fair estimate, based on the last month of sales.",
  high: "Based on the last 8 weeks of sales and their weekly pattern.",
} as const;

function chartBars(o: Overview): ChartBar[] {
  return [
    ...o.daily.map((d) => ({ date: d.date, amount: d.amount, count: d.count, forecast: false })),
    ...o.forecast.days.map((d) => ({ ...d, forecast: true })),
  ];
}

function Hero({ o }: { o: Overview }) {
  return (
    <section className="rise relative overflow-hidden rounded-[10px] bg-ink p-7 text-paper lg:col-span-5">
      <div className="zari absolute inset-x-0 top-0 h-1.5" aria-hidden />
      <p className="code text-[11px] uppercase tracking-[0.28em] text-gold-bright">Sales · last {RANGE_LABELS[o.range]}</p>
      <p className="display foil mt-4 text-5xl font-light sm:text-6xl" data-testid="kpi-revenue">{formatCompactINR(o.kpis.revenue.value)}</p>
      <p className="code mt-1 text-xs text-paper/50">{formatINR(o.kpis.revenue.value)} collected, GST included</p>
      <div className="mt-4"><Delta change={o.kpis.revenue.change} onDark /></div>
      <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-paper/10 pt-5 text-sm">
        <div><dt className="text-[10px] uppercase tracking-widest text-paper/45">Before GST</dt><dd className="code mt-1">{formatCompactINR(o.kpis.netSales)}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-widest text-paper/45">GST collected</dt><dd className="code mt-1">{formatCompactINR(o.kpis.gst)}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-widest text-paper/45">Discounts given</dt><dd className="code mt-1">{formatCompactINR(o.kpis.discount)}</dd></div>
      </dl>
    </section>
  );
}

function ForecastCard({ o }: { o: Overview }) {
  const f = o.forecast;
  const last7 = o.daily.slice(-7).reduce((a, d) => a + d.amount, 0);
  const busiest = [...f.days].sort((a, b) => b.amount - a.amount)[0];
  const trendPct = Math.round((f.trend - 1) * 100);
  if (f.total === 0) {
    return (
      <Card title="Next 7 days" className="rise-2 border-gold/40 bg-gold-wash/40">
        <p className="text-sm text-ink-soft">The forecast appears once there are a few days of sales. Every bill makes it more accurate.</p>
      </Card>
    );
  }
  return (
    <Card title="Next 7 days" hint="Forecast" className="rise-2 border-gold/40 bg-gold-wash/40">
      <p className="display text-4xl font-light" data-testid="forecast-total">{formatCompactINR(f.total)}</p>
      <p className="code mt-1 text-xs text-ink-soft">Likely between {formatCompactINR(f.low)} and {formatCompactINR(f.high)}</p>
      <ul className="mt-5 space-y-2.5 border-t border-gold/30 pt-4 text-sm">
        <li className="flex justify-between gap-3"><span className="text-ink-soft">Last 7 days</span><span className="code">{formatCompactINR(last7)}</span></li>
        <li className="flex justify-between gap-3"><span className="text-ink-soft">Busiest day expected</span><span>{WEEKDAYS[weekdayOf(busiest.date)]} · <span className="code">{formatCompactINR(busiest.amount)}</span></span></li>
        <li className="flex justify-between gap-3"><span className="text-ink-soft">Recent trend</span><span className="code">{trendPct === 0 ? "Steady" : `${trendPct > 0 ? "▲" : "▼"} ${Math.abs(trendPct)}%`}</span></li>
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-soft">{CONFIDENCE_TEXT[f.confidence]} Use it to plan stock and staff, not as a promise.</p>
    </Card>
  );
}

function PeopleTable({ o }: { o: Overview }) {
  if (o.bySalesperson.length === 0) return <p className="py-6 text-center text-sm text-ink-soft">No sales in this period yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
          <th className="py-2 pr-3 font-semibold">Salesperson</th><th className="px-3 py-2 text-right font-semibold">Bills</th>
          <th className="px-3 py-2 text-right font-semibold">Pieces</th><th className="py-2 pl-3 text-right font-semibold">Sales</th>
        </tr>
      </thead>
      <tbody>
        {o.bySalesperson.map((s, i) => (
          <tr key={s.name} className="border-b border-line last:border-0">
            <td className="py-2.5 pr-3"><span className="code mr-2 text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>{s.name}</td>
            <td className="code px-3 py-2.5 text-right">{s.count}</td>
            <td className="code px-3 py-2.5 text-right">{s.pieces}</td>
            <td className="code py-2.5 pl-3 text-right font-semibold">{formatCompactINR(s.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OpsStrip({ o }: { o: Overview }) {
  const tiles = [
    { label: "Waiting for payment", value: `${o.pending.count}`, sub: o.pending.count ? formatCompactINR(o.pending.amount) : "All bills settled", href: "/admin/billing/invoices?status=open" },
    { label: "Pieces ready to sell", value: o.stock.available.toLocaleString("en-IN"), sub: "Across your locations", href: "/admin/inventory" },
    { label: "On the way", value: o.stock.inTransit.toLocaleString("en-IN"), sub: "Sent, not yet received", href: "/admin/transfers" },
    { label: "On hold", value: o.stock.reserved.toLocaleString("en-IN"), sub: "Reserved for unpaid bills", href: "/admin/billing/invoices?status=open" },
  ];
  return (
    <section className="rise grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line lg:grid-cols-4" aria-label="Operations right now">
      {tiles.map((t) => (
        <Link key={t.label} href={t.href} className="group bg-card px-5 py-4 transition-colors hover:bg-gold-wash/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{t.label}</p>
          <p className="display mt-1 text-2xl font-light">{t.value} <span className="text-gold opacity-0 transition-opacity group-hover:opacity-100">→</span></p>
          <p className="text-xs text-ink-soft">{t.sub}</p>
        </Link>
      ))}
    </section>
  );
}

function VendorDuesCard({ p }: { p: PayablesSummary }) {
  const stats = [
    { label: "Overdue", value: formatCompactINR(p.overdue), alert: p.overdue > 0, sub: p.overdueBills ? `${p.overdueBills} bill${p.overdueBills === 1 ? "" : "s"} late` : "Nothing is late" },
    { label: "Paid, last 30 days", value: formatCompactINR(p.paidLast30), alert: false, sub: `${p.openBills} bill${p.openBills === 1 ? "" : "s"} still open` },
  ];
  return (
    <Card title="Vendor dues" hint="What the business owes its suppliers" className="rise-1">
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">To pay vendors</p>
          <p className="display mt-2 text-4xl font-light" data-testid="vendor-pending">{formatCompactINR(p.pending)}</p>
          <dl className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">{s.label}<span className="block text-[11px]">{s.sub}</span></dt>
                <dd className={`code ${s.alert ? "font-semibold text-madder" : ""}`}>{s.alert ? "! " : ""}{s.value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/admin/payables" className="btn btn-ghost mt-5 text-xs">Open vendor dues →</Link>
        </div>
        <div className="lg:col-span-2">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Largest pending amounts</p>
          <BarList ranked shareOf={p.pending} empty="No vendor payments are pending." rows={p.topVendors.map((v) => ({ key: v.vendorId, label: v.vendorName, tag: v.vendorCode, sub: v.overdue ? "has overdue bills" : `${v.openBills} open`, amount: v.pending }))} />
        </div>
      </div>
    </Card>
  );
}

export function Dashboard({ o, payables }: { o: Overview; payables?: PayablesSummary | null }) {
  const period = `last ${RANGE_LABELS[o.range]}`;
  return (
    <div className="space-y-6">
      {o.hasDemo && (
        <p role="status" className="rise rounded-md border border-gold/40 bg-gold-wash px-4 py-2.5 text-sm">
          <strong>Sample data.</strong> These figures include demo sales so you can see how the dashboard works. Remove them before going live.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Hero o={o} />
        <div className="grid grid-cols-2 gap-4 lg:col-span-7">
          <Kpi label="Bills raised" value={o.kpis.invoices.value.toLocaleString("en-IN")} delay={1}><Delta change={o.kpis.invoices.change} /></Kpi>
          <Kpi label="Average bill" value={formatCompactINR(o.kpis.avgBill.value)} delay={2}><Delta change={o.kpis.avgBill.change} /></Kpi>
          <Kpi label="Sarees sold" value={o.kpis.pieces.value.toLocaleString("en-IN")} delay={3}><Delta change={o.kpis.pieces.change} /></Kpi>
          {o.margin ? (
            <Kpi label="Gross margin" value={`${o.margin.pct}%`} delay={4}>
              <span className="text-xs text-ink-soft"><span className="code">{formatCompactINR(o.margin.amount)}</span> profit before expenses{o.margin.coveredPct < 100 ? ` · ${o.margin.coveredPct}% of sales have a cost price` : ""}</span>
            </Kpi>
          ) : (
            <Kpi label="Sarees per bill" value={o.kpis.invoices.value ? (o.kpis.pieces.value / o.kpis.invoices.value).toFixed(2) : "0"} delay={4}>
              <span className="text-xs text-ink-soft">Higher means better cross-selling</span>
            </Kpi>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Sales day by day" hint="Hover a bar for the day's figure" className="rise-1 lg:col-span-2">
          <SalesChart bars={chartBars(o)} />
        </Card>
        <ForecastCard o={o} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Which store is doing best" hint={period} className="rise-1">
          <BarList ranked empty="No sales in this period yet." rows={o.byLocation.map((l) => ({ key: l.id, label: l.name, tag: l.code, sub: `${l.count} bill${l.count === 1 ? "" : "s"}`, amount: l.amount }))} />
        </Card>
        <div className="space-y-6">
          <Card title="Where sales come from" hint="Stores, website, Instagram" className="rise-2">
            <BarList empty="No sales in this period yet." rows={o.byChannel.map((c) => ({ key: c.channel, label: CHANNEL_LABELS[c.channel] ?? c.channel, sub: `${c.count} bills`, amount: c.amount }))} />
          </Card>
          <Card title="How customers paid" className="rise-3">
            <BarList empty="No payments in this period yet." rows={o.byPayment.map((p) => ({ key: p.mode, label: PAYMENT_LABELS[p.mode] ?? p.mode, amount: p.amount }))} />
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top salespeople" hint={period} className="rise-1"><PeopleTable o={o} /></Card>
        <Card title="Best-selling sarees" hint={period} className="rise-2">
          <BarList ranked shareOf={o.kpis.revenue.value} empty="No sales in this period yet." rows={o.topProducts.map((p) => ({ key: p.sku, label: p.name, tag: p.sku, sub: `${p.pieces} sold`, amount: p.amount }))} />
        </Card>
      </div>

      {payables && <VendorDuesCard p={payables} />}

      {o.websiteOrders && (
        <Card title="Website orders" hint={period}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt>Paid website invoices</dt><dd className="code">{o.websiteOrders.invoiced.count} · {formatINR(o.websiteOrders.invoiced.amount)}</dd></div>
            <div><dt>Dummy payments recorded</dt><dd className="code">{o.websiteOrders.dummy.count} · {formatINR(o.websiteOrders.dummy.amount)}</dd></div>
            <div><dt>Test COD pending</dt><dd className="code">{o.websiteOrders.cod.count} · {formatINR(o.websiteOrders.cod.amount)}</dd></div>
            <div><dt>Cancelled test orders</dt><dd className="code">{o.websiteOrders.cancelled}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-ink-soft">Test amounts are excluded from sales revenue.</p>
          <Link href="/admin/orders" className="btn btn-ghost mt-4">Open online orders</Link>
        </Card>
      )}

      <OpsStrip o={o} />
    </div>
  );
}
