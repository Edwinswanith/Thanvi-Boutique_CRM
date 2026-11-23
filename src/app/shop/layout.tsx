import type { Metadata } from "next";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartProvider } from "@/components/shop/CartProvider";
import { ShopHeader } from "@/components/shop/ShopChrome";
import { ShopFooter } from "@/components/shop/ShopFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { COLLECTION_KEYS } from "@/lib/storefront/collections";
import { liveCollections } from "@/server/services/storefront";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Handloom Sarees Online", template: "%s · Thanvi Boutique" },
  description: "Silk, cotton, linen, tissue and organza handloom sarees from Thanvi Boutique, since 2016.",
};

/** Public storefront. Reads only published listings; not covered by the /admin auth middleware. */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const live = new Set((await liveCollections()).map((c) => c.key));
  const nav = COLLECTION_KEYS.filter((k) => live.has(k)).slice(0, 7);
  return (
    <CartProvider>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <div className="bg-ink py-2 text-center text-[11px] font-semibold tracking-[0.2em] text-gold-bright">
        HANDLOOM SINCE 2016 · EXCHANGE ONLY, NO REFUNDS
      </div>
      <ShopHeader collections={nav} />
      <main className="min-h-[60vh]">{children}</main>
      <ShopFooter />
      <CartDrawer />
    </CartProvider>
  );
}
