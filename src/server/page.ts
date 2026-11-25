import { redirect } from "next/navigation";
import { cache } from "react";
import type { Permission } from "@/lib/rbac/permissions";
import { can, type Actor } from "@/server/actor";
import { currentActor } from "@/server/auth/actor";

const pageUser = cache(currentActor);

/** For server pages: redirects to login when signed out; returns `allowed: false` when lacking permission. */
export async function pageActor(permission?: Permission): Promise<{ actor: Actor; allowed: boolean }> {
  const actor = await pageUser();
  if (!actor) redirect("/login");
  return { actor, allowed: permission ? can(actor, permission) : true };
}
