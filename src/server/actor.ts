import type { Permission, RoleLike } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/permissions";

/** The signed-in user performing an action, with their role resolved fresh from the DB. */
export interface Actor {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: RoleLike & { readonly id: string; readonly name: string };
  readonly locationIds: readonly string[];
}

export function can(actor: Actor, permission: Permission): boolean {
  return hasPermission(actor.role, permission);
}

/** True when the actor may act on data belonging to `locationId`. */
export function canAccessLocation(actor: Actor, locationId: string): boolean {
  return actor.role.allLocations || actor.locationIds.includes(locationId);
}
