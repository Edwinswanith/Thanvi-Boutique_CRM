import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { testCheckoutEnabled } from "@/server/services/shopCheckout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  if (!testCheckoutEnabled()) notFound();
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <h1 className="display mb-8 text-4xl sm:text-5xl">Test checkout</h1>
      <CheckoutForm />
    </div>
  );
}
