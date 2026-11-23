import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const LOCATION_TYPES = ["godown", "store", "online"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

const locationSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: LOCATION_TYPES, required: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    gstin: { type: String, default: "", uppercase: true, trim: true },
    invoicePrefix: { type: String, default: "", uppercase: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

locationSchema.index({ type: 1, active: 1 });

export type LocationDoc = InferSchemaType<typeof locationSchema>;
export const Location: Model<LocationDoc> =
  (models.Location as Model<LocationDoc>) || model<LocationDoc>("Location", locationSchema);
