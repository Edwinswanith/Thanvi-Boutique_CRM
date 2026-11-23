import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Website content for one product: photos (ordered, first = cover), copy, SEO and
 * publishing state. Price is NOT stored here — it always comes from Product.mrp.
 */
const webListingSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    /** Collection key (e.g. "silk"). Not named `collection`: that is reserved by Mongoose. */
    collectionKey: { type: String, default: "", trim: true },
    colour: { type: String, default: "", trim: true },
    shortDescription: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    highlights: { type: [String], default: [] },
    care: { type: String, default: "", trim: true },
    photoIds: { type: [String], default: [] },
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    /** Seeded showcase data; removable with `npm run seed:demo -- --remove`. */
    demo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

webListingSchema.index({ status: 1, collectionKey: 1 });
webListingSchema.index({ status: 1, featured: -1, publishedAt: -1 });
webListingSchema.index({ photoIds: 1 });

export type WebListingDoc = InferSchemaType<typeof webListingSchema>;
export const WebListing: Model<WebListingDoc> =
  (models.WebListing as Model<WebListingDoc>) || model<WebListingDoc>("WebListing", webListingSchema);
