import type { Metadata } from "next";
import { NAV, type NavSection } from "@/components/admin/nav";
import { Sidebar } from "@/components/admin/Sidebar";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";

export const dynamic = "force-dynamic";

/** Back office is never indexed (also disallowed in robots.txt). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { actor } = await pageActor();
  const sections: NavSection[] = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.permission || can(actor, i.permission)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen">
      <Sidebar sections={sections} userName={actor.name} roleName={actor.role.name} />
      <main className="px-5 pt-16 pb-16 lg:ml-64 lg:px-12 lg:pt-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
