import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
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
  return (
    <>
      <PageHeader
        eyebrow="Setup · People"
        title="Users"
        description="Give each person a role and the stores or godowns they work at. Deactivated users keep their history."
      />
      <UsersManager
        initial={users}
        roles={roles.map((r) => ({ id: r.id, name: r.name, allLocations: r.allLocations, isSystem: r.isSystem }))}
        locations={locations.filter((l) => l.active).map((l) => ({ id: l.id, code: l.code, name: l.name }))}
        selfId={actor.id}
        perms={{ create: can(actor, "system.users.create"), edit: can(actor, "system.users.edit") }}
      />
    </>
  );
}
