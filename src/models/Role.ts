import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", trim: true },
    permissions: { type: [String], default: [] },
    /** System role = Super Admin style: configuration only, never business data. */
    isSystem: { type: Boolean, default: false },
    /** May see cost price, margins and financial reports. */
    confidential: { type: Boolean, default: false },
    /** Ignores user location scoping (Owner, Manager Head). */
    allLocations: { type: Boolean, default: false },
    /** Built-in roles cannot be deleted (but permissions can be edited). */
    builtIn: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type RoleDoc = InferSchemaType<typeof roleSchema>;
export const Role: Model<RoleDoc> = (models.Role as Model<RoleDoc>) || model<RoleDoc>("Role", roleSchema);
