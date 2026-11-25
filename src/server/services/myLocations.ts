import { Types } from "mongoose";
import { Location, type LocationType } from "@/models/Location";
import type { Actor } from "@/server/actor";

export interface LocationOption {
  id: string;
  code: string;
  name: string;
  type: LocationType;
  acceptsVendorStock: boolean;
}

export function acceptsVendorStock(location: { type: LocationType; code: string; acceptsVendorStock?: boolean | null }) {
  return location.type === "godown" && (location.acceptsVendorStock ?? location.code === "GD1");
}

function toOption(location: { _id: Types.ObjectId; code: string; name: string; type: LocationType; acceptsVendorStock?: boolean | null }): LocationOption {
  return {
    id: String(location._id), code: location.code, name: location.name, type: location.type,
    acceptsVendorStock: acceptsVendorStock(location),
  };
}

/** Active locations the actor works at (all of them for all-location roles). For dropdowns. */
export async function myLocations(actor: Actor, types?: LocationType[]): Promise<LocationOption[]> {
  const scope = actor.role.allLocations ? {} : { _id: { $in: actor.locationIds.map((id) => new Types.ObjectId(id)) } };
  const docs = await Location.find({ ...scope, active: true, ...(types ? { type: { $in: types } } : {}) })
    .sort({ type: 1, code: 1 })
    .lean();
  return docs.map(toOption);
}

/** All active locations (names only) — e.g. to pick which godown to request stock from. */
export async function allLocationOptions(): Promise<LocationOption[]> {
  const docs = await Location.find({ active: true }).sort({ type: 1, code: 1 }).lean();
  return docs.map(toOption);
}
