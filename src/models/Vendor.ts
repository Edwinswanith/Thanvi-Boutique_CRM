import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const vendorSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    gstin: { type: String, default: "", uppercase: true, trim: true },
    address: { type: String, default: "", trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

vendorSchema.index({ name: 1 });

export type VendorDoc = InferSchemaType<typeof vendorSchema>;
export const Vendor: Model<VendorDoc> = (models.Vendor as Model<VendorDoc>) || model<VendorDoc>("Vendor", vendorSchema);
