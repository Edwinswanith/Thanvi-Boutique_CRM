import type { Metadata } from "next";
import Link from "next/link";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { Filters } from "@/components/admin/dashboard/Filters";
import { PageHeader } from "@/components/admin/PageHeader";
import { parseRange } from "@/lib/analytics/periods";
import type { Permission } from "@/lib/rbac/permissions";
import { Location } from "@/models/Location";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { can, canAccessLocation, type Actor } from "@/server/actor";
import { pageActor } from "@/server/page";
import { salesOverview } from "@/server/services/analytics";

export const metadata: Metadata = { title: "Home" };

interface Shortcut { href: string; title: string; text: string; permission?: Permission }

const SETUP_LINKS: Shortcut[] = [
  { href: "/admin/settings/stores", title: "Stores & godowns", text: "Open a new store in minutes. Inventory and billing appear for it automatically." },
  { href: "/admin/settings/roles", title: "Roles & permissions", text: "Decide who can view, create, approve or export, module by module." },
  { href: "/admin/settings/users", title: "Users", text: "Invite managers, salespeople and godown staff and assign their locations." },
  { href: "/admin/settings/numbering", title: "SKU & numbering", text: "Set SKU prefixes and starting numbers; preview the Code 39 label." },
];

/** What each role does day to day. Only the ones the person is allowed to use are shown. */
const WORK_LINKS: Shortcut[] = [
  { href: "/admin/billing", title: "New bill", text: "Scan the saree, take payment, print the invoice. Stock updates by itself.", permission: "sales.create" },
  { href: "/admin/inventory", title: "Find a saree", text: "Scan or type a code to see where a piece is and its full history.", permission: "inventory.view" },
  { href: "/admin/inventory/receive", title: "Receive stock", text: "Add a new product with a photo, get codes and print barcode labels.", permission: "inventory.create" },
  { href: "/admin/transfers", title: "Stock requests", text: "Ask the godown for stock, send it, and scan it in when it arrives.", permission: "transfers.view" },
  { href: "/admin/billing/invoices", title: "Invoices", text: "Look up past bills and pending payments.", permission: "sales.view" },
  { href: "/admin/catalog", title: "Online catalog", text: "Add photos and descriptions, then publish sarees to the website.", permission: "catalog.view" },
];

function ShortcutGrid({ links }: { links: Shortcut[] }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {links.map((l, i) => (
        <Link key={l.href} href={l.href} className={`panel rise rise-${Math.min(i + 1, 4)} group p-6 transition-colors hover:border-gold`}>
          <p className="display text-xl group-hover:text-ink-2">{l.title} <span className="inline-block text-gold transition-transform group-hover:translate-x-1">→</span></p>
          <p className="mt-2 text-sm text-ink-soft">{l.text}</p>
        </Link>
      ))}
    </section>
  );
}

async function SetupDesk() {
  const [stores, godowns, online, users, roles] = await Promise.all([
    Location.countDocuments({ type: "store", active: true }),
    Location.countDocuments({ type: "godown", active: true }),
    Location.countDocuments({ type: "online", active: true }),
    User.countDocuments({ active: true }),
    Role.countDocuments(),
  ]);
  const stats = [["Stores", stores], ["Godowns", godowns], ["Online channels", online], ["Active users", users], ["Roles", roles]] as const;
  return (
    <>
      <PageHeader eyebrow="System setup" title="Configuration desk" description="As Super Admin you shape the structure of the business: locations, people and access. Business data stays with the owner." />
      <section className="rise rise-1 mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-5 py-5">
            <p className="display text-4xl font-light">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-soft">{label}</p>
          </div>
        ))}
      </section>
      <ShortcutGrid links={SETUP_LINKS} />
    </>
  );
}

function WorkDesk({ actor }: { actor: Actor }) {
  const links = WORK_LINKS.filter((l) => !l.permission || can(actor, l.permission));
  return (
    <>
      <PageHeader eyebrow={actor.role.name} title={`Good to see you, ${actor.name.split(" ")[0]}`} description="Pick what you want to do. You only see the areas your role covers." />
      {links.length ? <ShortcutGrid links={links} /> : <p className="panel p-8 text-sm text-ink-soft">Your role has no areas yet. Ask your administrator to set your permissions.</p>}
    </>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ range?: string; store?: string }> }) {
  const { actor } = await pageActor();
  if (actor.role.isSystem) return <SetupDesk />;
  if (!can(actor, "dashboard.view")) return <WorkDesk actor={actor} />;

  const sp = await searchParams;
  const range = parseRange(sp.range);
  const locationId = sp.store && canAccessLocation(actor, sp.store) ? sp.store : null;
  const o = await salesOverview(actor, { range, locationId });
  const locations = [...o.byLocation].sort((a, b) => a.name.localeCompare(b.name)).map((l) => ({ id: l.id, name: l.name }));
  const selected = locations.find((l) => l.id === locationId);
  const scopeText = selected ? selected.name : actor.role.allLocations ? "All stores and online" : locations.map((l) => l.name).join(", ") || "No store assigned yet";

  return (
    <>
      <PageHeader
        eyebrow={actor.role.allLocations ? "Business overview" : "Store overview"}
        title={`Good to see you, ${actor.name.split(" ")[0]}`}
        description={`${scopeText}. Sales, best performers and what to expect next week.`}
        actions={<Filters range={range} locationId={locationId} locations={locations} />}
      />
      <Dashboard o={o} />
    </>
  );
}
