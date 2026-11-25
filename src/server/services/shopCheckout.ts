import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "@/lib/api";
import { checkoutSchema, type CheckoutQuote, type CheckoutResult } from "@/lib/storefront/checkout";
import { Item } from "@/models/Item";
import { Location } from "@/models/Location";
import { Order } from "@/models/Order";
import type { Actor } from "@/server/actor";
import { locationFilter } from "@/server/scope";
import { writeAudit } from "./audit";
import { priceShopOrder, shopProducts, shopTaxSettings } from "./shopPricing";
import { transitionItem } from "./stockLedger";

export function testCheckoutEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_TEST_CHECKOUT === "true";
}

function invoiceToken(id: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(`shop-test-invoice:${id}`).digest("hex");
}

export function canOpenTestInvoice(id: string, token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token) && timingSafeEqual(Buffer.from(token), Buffer.from(invoiceToken(id)));
}

export async function placeTestOrder(input: unknown): Promise<CheckoutResult> {
  const { requestId, expectedTotal, ...data } = checkoutSchema.parse(input);
  const requestHash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const resultFor = (order: { requestHash: string; number: string; total: number; status: string; paymentMethod: CheckoutResult["paymentMethod"]; paymentStatus: CheckoutResult["paymentStatus"]; breakdown?: CheckoutQuote | null }): CheckoutResult => {
    if (order.requestHash !== requestHash) throw new AppError("This order reference already belongs to a different checkout.", 409);
    if (order.status === "cancelled") throw new AppError("This order was cancelled. Start a new checkout to place another order.", 409);
    const breakdown = order.breakdown ? {
      merchandise: order.breakdown.merchandise, shipping: order.breakdown.shipping,
      cgst: order.breakdown.cgst, sgst: order.breakdown.sgst, igst: order.breakdown.igst,
      roundOff: order.breakdown.roundOff, total: order.breakdown.total,
    } : undefined;
    return {
      orderNumber: order.number, total: order.total, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, breakdown,
      ...(breakdown ? { invoiceUrl: `/shop/invoice/${requestId}?token=${invoiceToken(requestId)}` } : {}),
    };
  };
  const prior = await Order.findById(requestId).lean();
  if (prior) return resultFor(prior);

  await Order.init();
  const settings = await shopTaxSettings();
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const existing = await Order.findById(requestId).session(session).lean();
      if (existing) return resultFor(existing);
      const location = await Location.findOne({ code: "WEB", type: "online", active: true }).session(session).lean();
      if (!location) throw new AppError("Online stock is currently unavailable.", 409);
      const products = await shopProducts(data.lines, session);
      const pricing = priceShopOrder(products, data.customer.state, settings);
      if (expectedTotal !== undefined && pricing.breakdown.total !== expectedTotal) {
        throw new AppError("The order total changed. Review shipping and GST again.", 409);
      }
      const number = `WEB-${requestId.toUpperCase()}`;
      const lines = [];
      for (const [index, { listing, product, quantity }] of products.entries()) {
        const pieces = await Item.find({ productId: product._id, locationId: location._id, status: "available" })
          .sort({ _id: 1 }).limit(quantity).session(session).lean();
        if (pieces.length !== quantity) throw new AppError(`Only ${pieces.length} piece(s) of ${listing.title} available. Review your bag.`, 409);
        for (const piece of pieces) {
          await transitionItem({ id: null, name: "Website checkout" }, {
            code: piece.code,
            expect: { status: "available", locationId: location._id },
            set: { status: "sold", orderId: requestId, binId: null },
            movement: { type: "sale", reference: number, note: "Test storefront order" },
          }, session);
        }
        lines.push({ productId: product._id, slug: listing.slug, title: listing.title, quantity, unitPrice: product.mrp, itemIds: pieces.map((piece) => piece._id), ...pricing.itemLines[index] });
      }
      const [order] = await Order.create([{
        _id: requestId, requestHash, number, locationId: location._id, customer: data.customer, lines,
        total: pricing.breakdown.total, breakdown: pricing.breakdown, invoiceSeller: pricing.seller, shippingGstRate: pricing.shippingRate,
        paymentMethod: data.paymentMethod, paymentStatus: data.paymentMethod === "dummy" ? "test_paid" : "pending",
      }], { session });
      return resultFor(order);
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      const existing = await Order.findById(requestId).lean();
      if (existing) return resultFor(existing);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function cancelTestOrder(actor: Actor, id: string): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: id, test: true, ...locationFilter(actor) }).session(session).lean();
      if (!order) throw new AppError("Test order not found.", 404);
      if (order.status === "cancelled") return;

      const updated = await Order.updateOne({ _id: id, status: "confirmed" }, {
        $set: { status: "cancelled", cancelledAt: new Date() },
      }, { session });
      if (!updated.modifiedCount) throw new AppError("This order cannot be cancelled.", 409);

      const ids = order.lines.flatMap((line) => line.itemIds);
      const pieces = await Item.find({ _id: { $in: ids }, orderId: id }).session(session).lean();
      if (!ids.length || pieces.length !== ids.length) throw new AppError("The order's stock records could not be matched.", 409);
      for (const piece of pieces) {
        await transitionItem(actor, {
          code: piece.code,
          expect: { status: "sold", locationId: order.locationId, orderId: id },
          set: { status: "available", orderId: null },
          movement: { type: "release", reference: order.number, note: "Test order cancelled" },
        }, session);
      }
      await writeAudit(actor, {
        action: "order.cancel", entity: "order", entityId: id, reference: order.number,
        before: { status: order.status }, after: { status: "cancelled", piecesRestored: pieces.length },
      }, session);
    });
  } finally {
    await session.endSession();
  }
}
