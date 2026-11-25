import type { Metadata } from "next";
import { adminWorkspaces } from "@/components/admin/nav";
import { Sidebar } from "@/components/admin/Sidebar";
import { WorkspaceNav } from "@/components/admin/WorkspaceNav";
import { pageActor } from "@/server/page";
import { myLocations } from "@/server/services/myLocations";

export const dynamic = "force-dynamic";

/** Back office is never indexed (also disallowed in robots.txt). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { actor } = await pageActor();
  const locations = actor.role.isSystem || actor.role.slug === "vendor" ? [] : await myLocations(actor);
  const workspaces = adminWorkspaces(actor, locations);
  const items = workspaces.map(({ label, tabs }) => ({
    label,
    href: tabs[0].href,
    matches: tabs.flatMap((tab) => [tab.href, ...(tab.matches ?? [])]),
  }));

  return (
    <div className="min-h-screen">
      <Sidebar items={items} userName={actor.name} roleName={actor.role.name} />
      <main className="px-5 pt-16 pb-16 lg:ml-64 lg:px-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <WorkspaceNav workspaces={workspaces} />
          {children}
        </div>
      </main>
    </div>
  );
}
