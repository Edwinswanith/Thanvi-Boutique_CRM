import type { Metadata } from "next";
import Link from "next/link";
import { adminWorkspaces } from "@/components/admin/nav";
import { PageHeader } from "@/components/admin/PageHeader";
import { istDay } from "@/lib/analytics/periods";
import { formatINR } from "@/lib/money";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
import { can, canAccessLocation, type Actor } from "@/server/actor";
import { pageActor } from "@/server/page";
import { salesOverview } from "@/server/services/analytics";
import { myLocations } from "@/server/services/myLocations";
import { payablesSummary } from "@/server/services/payables";
import { stockSummary } from "@/server/services/stock";
import { listStockCounts } from "@/server/services/stockCounts";
import { listTransfers } from "@/server/services/transfers";

export const metadata: Metadata = { title: "Home" };

const desks = {
  owner: { title: "Business overview", description: "Check stock, sales and work that needs your approval." },
  "manager-head": { title: "Operations overview", description: "Review transfers, stock and sales across your locations." },
  manager: { title: "Shop desk", description: "Receive transfers, check stock and review your shop’s sales." },
  salesperson: { title: "Sales counter", description: "Start a bill, find a piece or open one of your invoices." },
  "content-editor": { title: "Website catalog", description: "Prepare listings, update photos and publish products." },
} as const;

type ActionLink = { href: string; label: string };

function ActionPanel({ primary, secondary }: { primary: ActionLink; secondary: ActionLink[] }) {
  return (
    <section aria-label="Quick actions" className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-line-strong border-l-4 border-l-gold bg-card px-5 py-4">
      <Link className="btn btn-primary" href={primary.href}>{primary.label}</Link>
      {secondary.map((action) => (
        <Link key={action.href} className="text-sm font-semibold underline decoration-line-strong underline-offset-4 hover:decoration-ink" href={action.href}>{action.label}</Link>
      ))}
    </section>
  );
}

function SetupDesk({ actor }: { actor: Actor }) {
  const tabs = adminWorkspaces(actor, []).find((workspace) => workspace.label === "Settings")?.tabs ?? [];
  return (
    <>
      <PageHeader title="Configuration desk" description="Set up locations, staff accounts and numbering." />
      {tabs.length > 0 && <ActionPanel primary={tabs[0]} secondary={tabs.slice(1)} />}
    </>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { actor } = await pageActor();
  if (actor.role.isSystem) return <SetupDesk actor={actor} />;
  if (actor.role.slug === "vendor") {
    return <PageHeader title="Vendor access" description="Contact the boutique team for updates on your deliveries and payments." />;
  }

  const [locations, params] = await Promise.all([myLocations(actor), searchParams]);
  const selected = locations.find((location) => location.id === params.location);
  const scopeLabel = actor.role.slug === "content-editor" ? "Website" : selected?.name ?? (locations.length > 1 ? "All assigned locations" : locations[0]?.name ?? "No location assigned");
  const locationQuery = selected ? "location=" + selected.id : "";
  const linkAt = (href: string) => locationQuery ? href + (href.includes("?") ? "&" : "?") + locationQuery : href;
  const groups = adminWorkspaces(actor, locations);
  const tabs = groups.flatMap((group) => group.tabs);
  const has = (href: string) => tabs.some((tab) => tab.href === href);
  const receiving = has("/admin/inventory/receive");
  const profile = desks[actor.role.slug as keyof typeof desks] ?? (actor.role.slug === "godown-staff"
    ? { title: receiving ? "Godown receiving" : "Godown distribution", description: receiving ? "Receive vendor stock, print labels and send pieces to the next location." : "Scan incoming pieces, then send stock to shops or WEB." }
    : { title: "Home", description: "Open a workspace to start your assigned work." });

  const [transfers, stockRows, sales, payables, counts] = await Promise.all([
    can(actor, "transfers.view") ? listTransfers(actor) : [],
    can(actor, "inventory.view") && actor.role.slug !== "salesperson" ? stockSummary(actor) : [],
    can(actor, "dashboard.view") ? salesOverview(actor, { range: "30d", locationId: selected?.id }) : null,
    can(actor, "payables.view") ? payablesSummary(actor) : null,
    can(actor, "counts.view") ? listStockCounts(actor) : [],
  ]);

  const tasks = transfers.flatMap((transfer) => {
    const at = (id: string) => canAccessLocation(actor, id) && (!selected || selected.id === id);
    const source = at(transfer.from.id);
    const destination = at(transfer.to.id);
    const label = transfer.status === "requested" && source && can(actor, "transfers.approve") ? "Approve request"
      : transfer.status === "approved" && source && can(actor, "transfers.edit") ? "Dispatch"
      : transfer.status === "in_transit" && destination && can(actor, "transfers.edit") ? "Receive transfer"
      : (source || destination) && (transfer.shortCodes.length > 0 || transfer.excessCodes.length > 0) && can(actor, "counts.approve") ? "Review difference"
      : null;
    return label ? [{ transfer, label }] : [];
  });

  const actions: ActionLink[] = [];
  if (actor.role.slug === "salesperson" && has("/admin/billing")) actions.push({ href: linkAt("/admin/billing"), label: "New bill" });
  if (actor.role.slug === "manager" && has("/admin/transfers") && can(actor, "transfers.create") && (selected?.type === "store" || (!selected && locations.some((location) => location.type === "store")))) {
    actions.push({ href: linkAt("/admin/transfers?mode=request"), label: "Request stock" });
  }
  if (receiving && (actor.role.slug === "godown-staff" || isOwnerAdmin(actor.role))) actions.push({ href: linkAt("/admin/inventory/receive"), label: "Receive vendor stock" });
  if (has("/admin/transfers") && actor.role.slug === "godown-staff") {
    actions.push({ href: linkAt("/admin/transfers?queue=incoming"), label: "Incoming transfers" });
    if (locations.length > 0 && can(actor, "transfers.create") && can(actor, "transfers.edit")) {
      actions.push({ href: linkAt("/admin/transfers?mode=direct"), label: "Send stock" });
    }
  }
  if (has("/admin/catalog") && actor.role.slug === "content-editor") actions.push({ href: "/admin/catalog", label: "Open catalog" });
  if (has("/admin/billing/invoices") && actor.role.slug === "salesperson") actions.push({ href: "/admin/billing/invoices", label: "My invoices" });
  if (has("/admin/inventory")) actions.push({ href: linkAt("/admin/inventory"), label: "Find item" });
  if (has("/admin/inventory/counts") && can(actor, "counts.create") && !isOwnerAdmin(actor.role)) {
    actions.push({ href: linkAt("/admin/inventory/counts"), label: "Count stock" });
  }
  if (has("/admin/transfers") && !actions.some((action) => action.href.startsWith("/admin/transfers"))) actions.push({ href: linkAt("/admin/transfers"), label: "Transfers" });
  if (has("/admin/orders")) actions.push({ href: "/admin/orders", label: "Online orders" });
  if (payables) actions.push({ href: "/admin/payables", label: "Vendor dues" });
  if (has("/admin/reports")) actions.push({ href: "/admin/reports", label: "View reports" });
  if (!actions.length) actions.push(...groups.filter((group) => group.label !== "Home").map((group) => group.tabs[0]));

  const rows = selected ? stockRows.filter((row) => row.locationId === selected.id) : stockRows;
  const countReviews = can(actor, "counts.approve") ? counts.filter((count) => count.status === "review" && (!selected || selected.id === count.locationId)) : [];
  const available = rows.reduce((sum, row) => sum + row.counts.available, 0);
  const transit = rows.reduce((sum, row) => sum + row.counts.in_transit, 0);
  const today = sales ? istDay(new Date(sales.generatedAt)) : "";
  const todaySales = sales?.daily.find((day) => day.date === today)?.amount ?? 0;
  const metrics = [
    ...(rows.length ? [{ label: "Available pieces", value: available }, { label: "Pieces in transit", value: transit }] : []),
    ...(sales ? [{ label: "Sales today", value: formatINR(todaySales) }, { label: "Sales in 30 days", value: formatINR(sales.kpis.revenue.value) }] : []),
  ];

  return (
    <>
      <PageHeader title={profile.title} description={profile.description} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
        <p><span className="font-semibold text-ink">{actor.role.name}</span> · {scopeLabel}</p>
        {locations.length > 1 && actor.role.slug !== "content-editor" && (
          <form action="/admin" className="flex items-center gap-2">
            <select aria-label="Work location" name="location" className="field" defaultValue={selected?.id ?? ""}>
              <option value="">All assigned locations</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
            <button className="btn btn-ghost">Apply</button>
          </form>
        )}
      </div>
      {actions.length > 0 && <ActionPanel primary={actions[0]} secondary={actions.slice(1)} />}
      {can(actor, "transfers.view") && (
        <section aria-labelledby="pending-transfers" className="mb-8">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="pending-transfers" className="display text-xl">Transfers to act on</h2>
            {tasks.length > 5 && <Link href={linkAt("/admin/transfers")} className="text-sm underline">View all {tasks.length}</Link>}
          </div>
          <div className="panel divide-y divide-line">
            {tasks.slice(0, 5).map(({ transfer, label }) => (
              <Link key={transfer.id} href={"/admin/transfers/" + transfer.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-gold-wash/35">
                <span><strong>{transfer.ref}</strong> · {transfer.from.name} → {transfer.to.name}</span>
                <span className="font-semibold text-ink">{label}</span>
              </Link>
            ))}
            {tasks.length === 0 && <p className="px-5 py-4 text-sm text-ink-soft">You’re up to date on transfers.</p>}
          </div>
        </section>
      )}
      {countReviews.length > 0 && (
        <section aria-labelledby="pending-counts" className="mb-8">
          <h2 id="pending-counts" className="display mb-3 text-xl">Stock counts to review</h2>
          <div className="panel divide-y divide-line">
            {countReviews.slice(0, 5).map((count) => (
              <Link key={count.id} href={"/admin/inventory/counts/" + count.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm hover:bg-gold-wash/35">
                <span><strong>{count.reference}</strong> · {count.locationName}</span>
                <span>{count.differences} differences</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {sales?.hasDemo && <p className="mb-2 text-xs text-ink-soft">Includes sample sales.</p>}
      {metrics.length > 0 && (
        <dl className={`mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line ${metrics.length > 2 ? "sm:grid-cols-4" : ""}`}>
          {metrics.map(({ label, value }) => (
            <div key={label} className="bg-card px-5 py-4">
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="display mt-1 text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {sales?.websiteOrders && has("/admin/orders") && (
        <section className="panel mb-6 p-5">
          <h2 className="display text-xl">Website orders</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-ink-soft">Dummy payments</dt><dd className="code">{sales.websiteOrders.dummy.count}</dd></div>
            <div><dt className="text-ink-soft">Test COD pending</dt><dd className="code">{sales.websiteOrders.cod.count}</dd></div>
            <div><dt className="text-ink-soft">Paid website invoices</dt><dd className="code">{sales.websiteOrders.invoiced.count}</dd></div>
          </dl>
        </section>
      )}
      {payables && (
        <section aria-label="Supplier payments" className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-ink-soft">Due to vendors</p>
            <p className="display text-xl" data-testid="vendor-pending">{formatINR(payables.pending)}</p>
          </div>
          {payables.drafts > 0 && <Link href="/admin/payables?status=draft" className="text-sm underline">{payables.drafts} bills need an amount</Link>}
        </section>
      )}
    </>
  );
}
