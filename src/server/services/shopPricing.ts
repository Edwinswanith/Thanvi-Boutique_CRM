import type { ClientSession } from "mongoose";
import { AppError } from "@/lib/api";
import { calculateInvoice, GstError, stateFromGstin, supplyTypeFor } from "@/lib/gst/engine";
import { GST_STATES } from "@/lib/gst/states";
import { checkoutQuoteSchema, type CheckoutQuote, type CheckoutQuoteInput } from "@/lib/storefront/checkout";
import { Location } from "@/models/Location";
import { Product } from "@/models/Product";
import { WebListing } from "@/models/WebListing";
import { activeTaxRules, getInvoiceSettings } from "./taxSettings";

export async function shopProducts(lines: CheckoutQuoteInput["lines"], session?: ClientSession) {
  const listings = await WebListing.find({ slug: { $in: lines.map((line) => line.slug) }, status: "published" }, null, { session }).lean();
  const products = await Product.find({ _id: { $in: listings.map((listing) => listing.productId) } }, null, { session }).lean();
  const bySlug = new Map(listings.map((listing) => [listing.slug, listing]));
  const byProduct = new Map(products.map((product) => [String(product._id), product]));
  return lines.map((line) => {
    const listing = bySlug.get(line.slug);
    const product = listing && byProduct.get(String(listing.productId));
    if (!listing || !product) throw new AppError("A product is no longer available. Review your bag.", 409);
    if (product.mrp !== line.unitPrice) throw new AppError(`The price of ${listing.title} changed. Review your bag.`, 409);
    return { ...line, listing, product };
  });
}

export async function shopTaxSettings() {
  const [invoice, rules, web] = await Promise.all([
    getInvoiceSettings(),
    activeTaxRules(),
    Location.findOne({ code: "WEB", type: "online", active: true }).select("gstin address city").lean(),
  ]);
  if (!web) throw new AppError("Online stock is currently unavailable.", 409);
  const shipping = Number(process.env.SHOP_TEST_SHIPPING_PAISE ?? 0);
  const shippingRate = Number(process.env.SHOP_TEST_SHIPPING_GST_RATE ?? 0);
  if (!Number.isSafeInteger(shipping) || shipping < 0 || shipping > 10000000 || !Number.isFinite(shippingRate) || shippingRate < 0 || shippingRate > 100) {
    throw new AppError("Test shipping configuration is invalid.", 503);
  }
  const seller = { name: invoice.legalName, gstin: web.gstin || invoice.gstin, address: [web.address, web.city].filter(Boolean).join(", ") || invoice.address };
  return { invoice, rules, shipping, shippingRate, seller };
}

export function priceShopOrder(products: Awaited<ReturnType<typeof shopProducts>>, state: string, settings: Awaited<ReturnType<typeof shopTaxSettings>>) {
  const { invoice, rules, shipping, shippingRate, seller } = settings;
  const sellerState = stateFromGstin(seller.gstin) ?? invoice.stateCode;
  const supplyType = supplyTypeFor(sellerState, GST_STATES.find(([, label]) => label === state)?.[0]);
  try {
    const itemLines = products.map(({ slug, product, quantity }) => {
      const { lines: [tax] } = calculateInvoice([{ key: slug, hsn: product.hsn, mrp: product.mrp }], rules, { pricesIncludeTax: invoice.pricesIncludeTax, supplyType, roundToRupee: false });
      return { hsn: tax.hsn, gstRate: tax.rate, taxable: tax.taxable * quantity, cgst: tax.cgst * quantity, sgst: tax.sgst * quantity, igst: tax.igst * quantity, total: tax.total * quantity };
    });
    const delivery = calculateInvoice([{ key: "shipping", hsn: "SHIP", mrp: shipping }], [{ name: "Test shipping", hsnPrefixes: ["SHIP"], slabs: [{ upTo: null, rate: shippingRate }] }], { pricesIncludeTax: false, supplyType, roundToRupee: false }).totals;
    const sum = (key: "taxable" | "cgst" | "sgst" | "igst") => itemLines.reduce((amount, line) => amount + line[key], 0);
    const merchandise = sum("taxable");
    const cgst = sum("cgst") + delivery.cgst;
    const sgst = sum("sgst") + delivery.sgst;
    const igst = sum("igst") + delivery.igst;
    const exact = merchandise + shipping + cgst + sgst + igst;
    const total = invoice.roundToRupee ? Math.round(exact / 100) * 100 : exact;
    const breakdown: CheckoutQuote = { merchandise, shipping, cgst, sgst, igst, roundOff: total - exact, total };
    return { breakdown, itemLines, seller, shippingRate };
  } catch (error) {
    if (error instanceof GstError) throw new AppError(error.message, 422);
    throw error;
  }
}

export async function quoteShopOrder(input: unknown): Promise<CheckoutQuote> {
  const data = checkoutQuoteSchema.parse(input);
  const [products, settings] = await Promise.all([shopProducts(data.lines), shopTaxSettings()]);
  return priceShopOrder(products, data.customer.state, settings).breakdown;
}
