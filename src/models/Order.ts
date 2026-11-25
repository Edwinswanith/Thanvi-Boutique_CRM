import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const lineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  hsn: String,
  gstRate: Number,
  taxable: Number,
  cgst: Number,
  sgst: Number,
  igst: Number,
  total: Number,
  itemIds: [{ type: Schema.Types.ObjectId, ref: "Item", required: true }],
}, { _id: false });

const breakdownSchema = new Schema({
  merchandise: { type: Number, required: true },
  shipping: { type: Number, required: true },
  cgst: { type: Number, required: true },
  sgst: { type: Number, required: true },
  igst: { type: Number, required: true },
  roundOff: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const orderSchema = new Schema({
  // The client supplies a UUID for safe retries. Using _id makes uniqueness immediate.
  _id: { type: String, required: true },
  requestHash: { type: String, required: true },
  number: { type: String, required: true },
  locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
  },
  lines: { type: [lineSchema], required: true },
  total: { type: Number, required: true },
  breakdown: { type: breakdownSchema, default: undefined },
  invoiceSeller: { name: String, address: String, gstin: String },
  shippingGstRate: Number,
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["confirmed", "cancelled"] as const, default: "confirmed" },
  cancelledAt: { type: Date, default: null },
  paymentMethod: { type: String, enum: ["dummy", "cod"] as const, required: true },
  paymentStatus: { type: String, enum: ["test_paid", "pending"] as const, required: true },
  test: { type: Boolean, default: true },
}, { timestamps: true });
orderSchema.index({ locationId: 1, createdAt: -1 });

type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order: Model<OrderDoc> = (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", orderSchema);
