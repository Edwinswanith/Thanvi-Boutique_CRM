import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Records which one-off data migrations have run, so each runs exactly once. */
const appMetaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export type AppMetaDoc = InferSchemaType<typeof appMetaSchema>;
export const AppMeta: Model<AppMetaDoc> = (models.AppMeta as Model<AppMetaDoc>) || model<AppMetaDoc>("AppMeta", appMetaSchema);
