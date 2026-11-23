import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const numberSeriesSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    prefix: { type: String, default: "", uppercase: true, trim: true },
    /** The next number that will be issued. */
    next: { type: Number, required: true, min: 0 },
    padding: { type: Number, default: 4, min: 1, max: 10 },
  },
  { timestamps: true },
);

export type NumberSeriesDoc = InferSchemaType<typeof numberSeriesSchema>;
export const NumberSeries: Model<NumberSeriesDoc> =
  (models.NumberSeries as Model<NumberSeriesDoc>) || model<NumberSeriesDoc>("NumberSeries", numberSeriesSchema);
