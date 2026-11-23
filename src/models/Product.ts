import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A design/SKU. Physical pieces of it are `Item` documents. Money is stored in paise. */
const productSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    hsn: { type: String, required: true, trim: true },
    mrp: { type: Number, required: true, min: 0 },
    /** Confidential: only returned to roles with `confidential`. */
    costPrice: { type: Number, default: null, min: 0, select: false },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    color: { type: String, default: "", trim: true },
    fabric: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    photoIds: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", sku: "text", category: "text" });
productSchema.index({ category: 1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product: Model<ProductDoc> = (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", productSchema);
