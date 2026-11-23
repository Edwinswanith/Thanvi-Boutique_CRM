import { vendorCreateSchema } from "@/lib/validation/inventory";
import { Vendor } from "@/models/Vendor";
import type { Actor } from "@/server/actor";
import { writeAudit } from "./audit";
import { nextCode } from "./numberSeries";

export interface VendorView {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  active: boolean;
}

type VendorLean = Omit<VendorView, "id"> & { _id: unknown };

const toView = (v: VendorLean): VendorView => ({
  id: String(v._id),
  code: v.code,
  name: v.name,
  contactName: v.contactName ?? "",
  phone: v.phone ?? "",
  email: v.email ?? "",
  gstin: v.gstin ?? "",
  address: v.address ?? "",
  active: v.active,
});

export async function listVendors(): Promise<VendorView[]> {
  const docs = await Vendor.find().sort({ name: 1 }).lean<VendorLean[]>();
  return docs.map(toView);
}

/** Vendor IDs (XY1, XY2 …) come from the `vendor` number series. */
export async function createVendor(actor: Actor, input: unknown): Promise<VendorView> {
  const data = vendorCreateSchema.parse(input);
  const code = await nextCode("vendor");
  const doc = await Vendor.create({ ...data, code });
  const view = toView(doc.toObject() as VendorLean);
  await writeAudit(actor, { action: "vendor.create", entity: "vendor", entityId: view.id, reference: code, after: view });
  return view;
}
