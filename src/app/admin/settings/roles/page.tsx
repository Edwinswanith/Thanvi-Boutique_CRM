import type { Metadata } from "next";
import Link from "next/link";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { isOwnerAdmin } from "@/lib/rbac/permissions";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listRoles } from "@/server/services/roles";
import { RolesManager } from "./RolesManager";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const { actor, allowed } = await pageActor("system.roles.view");
  if (!allowed) return <Forbidden />;
  const roles = await listRoles();
  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Set which actions each role can perform."
        actions={can(actor, "system.users.view") && <Link href="/admin/settings/users" className="btn btn-ghost">Back to users</Link>}
      />
      <RolesManager
        initial={roles}
        currentRoleId={actor.role.id}
        canGrantConfidential={isOwnerAdmin(actor.role)}
        perms={{
          create: can(actor, "system.roles.create"),
          edit: can(actor, "system.roles.edit"),
          remove: can(actor, "system.roles.delete"),
        }}
      />
    </>
  );
}
