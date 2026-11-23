import { Types } from "mongoose";
import { AppError } from "@/lib/api";
import type { Actor } from "@/server/actor";
import { canAccessLocation } from "@/server/actor";

/** Mongo filter restricting `field` to the actor's locations (no-op for all-location roles). */
export function locationFilter(actor: Actor, field = "locationId"): Record<string, unknown> {
  if (actor.role.allLocations) return {};
  return { [field]: { $in: actor.locationIds.map((id) => new Types.ObjectId(id)) } };
}

export function assertLocation(actor: Actor, locationId: string): void {
  if (!Types.ObjectId.isValid(locationId)) throw new AppError("Unknown location", 422);
  if (!canAccessLocation(actor, locationId)) throw new AppError("You don't have access to this location", 403);
}

export function oid(id: string, what = "record"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new AppError(`Unknown ${what}`, 404);
  return new Types.ObjectId(id);
}
