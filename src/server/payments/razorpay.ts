import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/api";

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Constant-time check of Razorpay's `X-Razorpay-Signature` header (HMAC-SHA256 of the raw body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface PaymentLinkInput {
  amountPaise: number;
  invoiceNumber: string;
  description: string;
  customer: { name: string; phone: string };
}

export interface PaymentLink {
  id: string;
  shortUrl: string;
}

/** Creates a Razorpay Payment Link (UPI/card/netbanking) for an open invoice. */
export async function createPaymentLink(input: PaymentLinkInput, fetchImpl: typeof fetch = fetch): Promise<PaymentLink> {
  if (!razorpayConfigured()) throw new AppError("Razorpay is not configured yet. Add the keys to the server settings.", 503);
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetchImpl(`${API}/payment_links`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      reference_id: input.invoiceNumber,
      description: input.description.slice(0, 2000),
      customer: { name: input.customer.name || undefined, contact: input.customer.phone || undefined },
      notify: { sms: Boolean(input.customer.phone), email: false },
      reminder_enable: true,
    }),
  });
  const body = (await res.json().catch(() => null)) as { id?: string; short_url?: string; error?: { description?: string } } | null;
  if (!res.ok || !body?.id || !body.short_url) {
    console.error("[razorpay] payment link failed", res.status, body?.error?.description);
    throw new AppError("Could not create the Razorpay payment link. Try again or take another payment mode.", 502);
  }
  return { id: body.id, shortUrl: body.short_url };
}

export interface PaidEvent {
  linkId: string;
  paymentId: string;
  amountPaise: number;
}

/** Extracts the fields we act on from a `payment_link.paid` webhook; null for other events. */
export function parsePaidEvent(payload: unknown): PaidEvent | null {
  const p = payload as {
    event?: string;
    payload?: { payment_link?: { entity?: { id?: string } }; payment?: { entity?: { id?: string; amount?: number } } };
  };
  if (p?.event !== "payment_link.paid") return null;
  const linkId = p.payload?.payment_link?.entity?.id;
  const payment = p.payload?.payment?.entity;
  if (!linkId || !payment?.id || typeof payment.amount !== "number") return null;
  return { linkId, paymentId: payment.id, amountPaise: payment.amount };
}
