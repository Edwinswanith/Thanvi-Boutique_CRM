import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ITEM_STATUSES } from "./Item";

const snapshot = new Schema({
  code: { type: String, required: true },
  status: { type: String, enum: ITEM_STATUSES, required: true },
  updatedAt: { type: Date, required: true },
  missingFrom: { type: String, enum: ITEM_STATUSES, default: null },
}, { _id: false });

const stockCountSchema = new Schema({
  reference: { type: String, unique: true, required: true },
  locationId: { type: Schema.Types.ObjectId, required: true, ref: "Location" },
  locationName: { type: String, required: true },
  sku: { type: String, default: "" },
  binId: { type: Schema.Types.ObjectId, ref: "Bin", default: null },
  binCode: { type: String, default: "" },
  status: { type: String, enum: ["open", "review", "completed", "cancelled"] as const, default: "open" },
  expected: { type: [snapshot], default: [] },
  found: { type: [snapshot], default: [] },
  scanned: { type: [String], default: [] },
  missing: { type: [String], default: [] },
  unexpected: { type: [String], default: [] },
  reason: { type: String, default: "" },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  reviewedBy: { type: String, default: "" },
}, { timestamps: true });

stockCountSchema.index({ locationId: 1, status: 1, createdAt: -1 });

export type StockCountDoc = InferSchemaType<typeof stockCountSchema>;
export const StockCount: Model<StockCountDoc> =
  (models.StockCount as Model<StockCountDoc>) || model<StockCountDoc>("StockCount", stockCountSchema);
