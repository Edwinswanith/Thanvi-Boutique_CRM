import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { Location } from "@/models/Location";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { pageActor } from "@/server/page";

async function setupCounts() {
  const [stores, godowns, online, users, roles] = await Promise.all([
    Location.countDocuments({ type: "store", active: true }),
    Location.countDocuments({ type: "godown", active: true }),
    Location.countDocuments({ type: "online", active: true }),
    User.countDocuments({ active: true }),
    Role.countDocuments(),
  ]);
  return { stores, godowns, online, users, roles };
}

const SETUP_LINKS = [
  { href: "/admin/settings/stores", title: "Stores & godowns", text: "Open a new store in minutes. Inventory and billing appear for it automatically." },
  { href: "/admin/settings/roles", title: "Roles & permissions", text: "Decide who can view, create, approve or export, module by module." },
  { href: "/admin/settings/users", title: "Users", text: "Invite managers, salespeople and godown staff and assign their locations." },
  { href: "/admin/settings/numbering", title: "SKU & numbering", text: "Set SKU prefixes and starting numbers; preview the Code 39 label." },
];

export default async function AdminHome() {
  const { actor } = await pageActor();

  if (!actor.role.isSystem) {
    return (
      <>
        <PageHeader eyebrow="Welcome" title={`Good to see you, ${actor.name.split(" ")[0]}`} description="Inventory, billing and reports arrive in the next phases. Your access is already set up." />
        <div className="panel rise rise-2 p-8">
          <p className="display text-xl">Coming next</p>
          <p className="mt-2 text-sm text-ink-soft">Phase 1 brings vendor receiving, SKU and barcode labels, stock requests and full traceability.</p>
        </div>
      </>
    );
  }

  const c = await setupCounts();
  const stats = [
    { label: "Stores", value: c.stores },
    { label: "Godowns", value: c.godowns },
    { label: "Online channels", value: c.online },
    { label: "Active users", value: c.users },
    { label: "Roles", value: c.roles },
  ];
  return (
    <>
      <PageHeader eyebrow="System setup" title="Configuration desk" description="As Super Admin you shape the structure of the business: locations, people and access. Business data stays with the owner." />
      <section className="rise rise-1 mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-5 py-5">
            <p className="display text-4xl font-light">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-soft">{s.label}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {SETUP_LINKS.map((l, i) => (
          <Link key={l.href} href={l.href} className={`panel rise rise-${i + 1} group p-6 transition-colors hover:border-gold`}>
            <p className="display text-xl group-hover:text-ink-2">{l.title} <span className="text-gold transition-transform group-hover:translate-x-1 inline-block">→</span></p>
            <p className="mt-2 text-sm text-ink-soft">{l.text}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
