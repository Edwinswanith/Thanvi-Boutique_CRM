import type { ClientSession, Types } from "mongoose";
import { AppError } from "@/lib/api";
import { Item, type ItemStatus } from "@/models/Item";
import { StockMovement, type MovementType } from "@/models/StockMovement";
import type { Actor } from "@/server/actor";

export interface TransitionInput {
  code: string;
  expect: { status: ItemStatus | ItemStatus[]; locationId?: Types.ObjectId | string };
  set: Partial<{
    status: ItemStatus;
    locationId: Types.ObjectId | string;
    binId: Types.ObjectId | string | null;
    transferId: Types.ObjectId | string | null;
    invoiceId: Types.ObjectId | string | null;
  }>;
  movement: { type: MovementType; reference?: string; note?: string };
}

/**
 * The ONLY way to change an item's status or place. Conditional update (so two
 * people can never sell or dispatch the same piece) plus a ledger row, both in
 * the caller's transaction.
 */
export async function transitionItem(actor: Actor, input: TransitionInput, session: ClientSession) {
  const statuses = Array.isArray(input.expect.status) ? input.expect.status : [input.expect.status];
  const filter: Record<string, unknown> = { code: input.code, status: { $in: statuses } };
  if (input.expect.locationId) filter.locationId = input.expect.locationId;

  const before = await Item.findOneAndUpdate(filter, { $set: input.set }, { session, returnDocument: "before" }).lean();
  if (!before) {
    const current = await Item.findOne({ code: input.code }, { status: 1 }, { session }).lean();
    if (!current) throw new AppError(`Item ${input.code} not found`, 404);
    throw new AppError(`Item ${input.code} is ${current.status.replace("_", " ")} here — cannot ${input.movement.type.replace("_", " ")}`, 409);
  }

  await StockMovement.create(
    [
      {
        itemId: before._id,
        code: before.code,
        type: input.movement.type,
        fromLocationId: before.locationId,
        toLocationId: input.set.locationId ?? before.locationId,
        fromBinId: before.binId,
        toBinId: input.set.binId !== undefined ? input.set.binId : before.binId,
        fromStatus: before.status,
        toStatus: input.set.status ?? before.status,
        reference: input.movement.reference ?? "",
        note: input.movement.note ?? "",
        actorId: actor.id,
        actorName: actor.name,
      },
    ],
    { session },
  );
  return before;
}
