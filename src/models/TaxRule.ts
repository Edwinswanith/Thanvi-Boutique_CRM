import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const slabSchema = new Schema(
  {
    /** Upper bound of the taxable value per piece, in paise. null = no upper bound. */
    upTo: { type: Number, default: null, min: 0 },
    rate: { type: Number, required: true, min: 0, max: 28 },
  },
  { _id: false },
);

/**
 * GST rule matched by HSN prefix (longest prefix wins). Slabs are checked in
 * ascending order of `upTo`. Rules start as `draft` until the CA approves them.
 */
const taxRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    hsnPrefixes: { type: [String], required: true },
    slabs: { type: [slabSchema], required: true },
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
    note: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type TaxRuleDoc = InferSchemaType<typeof taxRuleSchema>;
export const TaxRule: Model<TaxRuleDoc> = (models.TaxRule as Model<TaxRuleDoc>) || model<TaxRuleDoc>("TaxRule", taxRuleSchema);
