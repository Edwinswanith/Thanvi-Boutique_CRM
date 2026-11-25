import type { Metadata } from "next";
import { BagView } from "@/components/shop/BagView";
import { testCheckoutEnabled } from "@/server/services/shopCheckout";

export const metadata: Metadata = { title: "Your bag", robots: { index: false, follow: true } };

export default function BagPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <h1 className="display text-4xl sm:text-5xl">Your bag</h1>
      <div className="zari-rule mt-3 mb-10 w-20" />
      <BagView checkoutEnabled={testCheckoutEnabled()} />
    </div>
  );
}
