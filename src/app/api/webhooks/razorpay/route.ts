import type { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { parsePaidEvent, verifyWebhookSignature } from "@/server/payments/razorpay";
import { applyRazorpayPayment } from "@/server/services/invoiceLifecycle";

/**
 * Razorpay → us. Not session-authenticated: trust comes only from the HMAC
 * signature over the raw body. Always 200 for events we ignore so Razorpay stops retrying.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"), process.env.RAZORPAY_WEBHOOK_SECRET)) {
    return fail("Invalid signature", 401);
  }
  try {
    const event = parsePaidEvent(JSON.parse(raw));
    if (!event) return ok({ ignored: true });
    await connectDb();
    return ok({ result: await applyRazorpayPayment(event) });
  } catch (err) {
    return handleError(err);
  }
}
