import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A physical storage spot inside a location, e.g. rack R2, shelf S3 → code "R2-S3".
 * Items point to a bin so a scan tells staff exactly where the piece sits.
 */
const binSchema = new Schema(
  {
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    zone: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

binSchema.index({ locationId: 1, code: 1 }, { unique: true });

export type BinDoc = InferSchemaType<typeof binSchema>;
export const Bin: Model<BinDoc> = (models.Bin as Model<BinDoc>) || model<BinDoc>("Bin", binSchema);
