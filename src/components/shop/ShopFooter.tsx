import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { COLLECTIONS } from "@/lib/storefront/collections";

const CITIES = ["Chennai", "Madurai", "Karaikudi", "Coimbatore"];

export function ShopFooter() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="zari h-1" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandLogo tone="dark" className="h-auto w-36" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/65">
            Authentic handloom sarees since 2016, in cotton, silk, linen and Banarasi blends, chosen with the artisans who weave them.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.25em] text-gold-bright">SHOP BY FABRIC</p>
          <ul className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-paper/70">
            {COLLECTIONS.map((f) => (
              <li key={f.key}><Link href={`/shop/sarees?fabric=${f.key}`} className="link-grow hover:text-paper">{f.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.25em] text-gold-bright">VISIT US</p>
          <ul className="mt-4 space-y-2 text-sm text-paper/70">
            {CITIES.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p className="mt-6 text-xs text-paper/50">Exchange only · no refunds</p>
          <Link href="/shop/about" className="link-grow mt-4 inline-block text-sm text-paper/80 hover:text-paper">About Thanvi Boutique &amp; FAQs</Link>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-[11px] text-paper/40 sm:px-6">
          Thanvi Boutique · Handloom sarees
        </p>
      </div>
    </footer>
  );
}
