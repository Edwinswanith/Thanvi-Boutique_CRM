import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listLocations } from "@/server/services/locations";
import { listRoles } from "@/server/services/roles";
import { listUsers } from "@/server/services/users";
import { UsersManager } from "./UsersManager";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const { actor, allowed } = await pageActor("system.users.view");
  if (!allowed) return <Forbidden />;
  const [users, roles, locations] = await Promise.all([listUsers(), listRoles(), listLocations()]);
  const owner = isOwnerAdmin(actor.role);
  return (
    <>
      <PageHeader
        title="Users & permissions"
        description="Assign job roles and work locations."
        actions={can(actor, "system.roles.view") && <Link href="/admin/settings/roles" className="btn btn-ghost">Manage roles</Link>}
      />
      <UsersManager
        initial={users}
        roles={roles.map((r) => ({ id: r.id, name: r.name, allLocations: r.allLocations, assignable: owner || !(r.isSystem || r.confidential || isOwnerAdmin(r)) }))}
        locations={locations.filter((l) => l.active).map((l) => ({ id: l.id, code: l.code, name: l.name }))}
        selfId={actor.id}
        perms={{ create: can(actor, "system.users.create"), edit: can(actor, "system.users.edit") }}
      />
    </>
  );
}
