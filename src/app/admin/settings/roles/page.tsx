import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
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
        eyebrow="Setup · Access"
        title="Roles & permissions"
        description="Each role is a grid of modules and actions. The Super Admin role is locked to setup only, so it never sees sales, stock or costs."
      />
      <RolesManager
        initial={roles}
        currentRoleId={actor.role.id}
        perms={{
          create: can(actor, "system.roles.create"),
          edit: can(actor, "system.roles.edit"),
          remove: can(actor, "system.roles.delete"),
        }}
      />
    </>
  );
}
