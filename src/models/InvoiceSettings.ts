import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const INVOICE_TEMPLATES = ["classic", "compact"] as const;
export type InvoiceTemplateKey = (typeof INVOICE_TEMPLATES)[number];

/**
 * Business-wide billing configuration (singleton, key = "default").
 * When the client shares their sample invoice, these fields + the template
 * component in src/components/invoice/ are what get adjusted.
 */
const invoiceSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    legalName: { type: String, default: "Thanvi Boutique", trim: true },
    tradeName: { type: String, default: "Thanvi Boutique", trim: true },
    address: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    /** Fallback GSTIN when a store has none of its own. */
    gstin: { type: String, default: "", uppercase: true, trim: true },
    /** Two-digit GST state code of the business, e.g. "33" for Tamil Nadu. */
    stateCode: { type: String, default: "33", trim: true },
    /** MRP printed on tags includes GST (normal for retail). */
    pricesIncludeTax: { type: Boolean, default: true },
    roundToRupee: { type: Boolean, default: true },
    template: { type: String, enum: INVOICE_TEMPLATES, default: "classic" },
    title: { type: String, default: "TAX INVOICE", trim: true },
    showHsn: { type: Boolean, default: true },
    showSalesperson: { type: Boolean, default: true },
    terms: { type: String, default: "Goods once sold will not be taken back.", trim: true },
    footer: { type: String, default: "Thank you for shopping with us!", trim: true },
    signatureLabel: { type: String, default: "Authorised Signatory", trim: true },
  },
  { timestamps: true },
);

export type InvoiceSettingsDoc = InferSchemaType<typeof invoiceSettingsSchema>;
export const InvoiceSettings: Model<InvoiceSettingsDoc> =
  (models.InvoiceSettings as Model<InvoiceSettingsDoc>) ||
  model<InvoiceSettingsDoc>("InvoiceSettings", invoiceSettingsSchema);
