import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const MOVEMENT_TYPES = [
  "receive",
  "move_bin",
  "dispatch",
  "transfer_receive",
  "reserve",
  "release",
  "sale",
  "status_change",
  "adjustment",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Append-only ledger: the full life story of every piece. Never updated or deleted. */
const stockMovementSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    code: { type: String, required: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    fromLocationId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
    toLocationId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
    fromBinId: { type: Schema.Types.ObjectId, ref: "Bin", default: null },
    toBinId: { type: Schema.Types.ObjectId, ref: "Bin", default: null },
    fromStatus: { type: String, default: "" },
    toStatus: { type: String, default: "" },
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "system" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ itemId: 1, createdAt: 1 });
stockMovementSchema.index({ code: 1, createdAt: 1 });

export type StockMovementDoc = InferSchemaType<typeof stockMovementSchema>;
export const StockMovement: Model<StockMovementDoc> =
  (models.StockMovement as Model<StockMovementDoc>) || model<StockMovementDoc>("StockMovement", stockMovementSchema);
