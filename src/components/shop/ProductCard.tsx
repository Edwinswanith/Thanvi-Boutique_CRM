"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { collectionLabel, formatPrice } from "@/lib/storefront/collections";
import type { StoreProduct } from "@/server/services/storefront";
import { useCart } from "./CartProvider";
import { Reveal } from "./Reveal";

interface ProductCardProps {
  product: StoreProduct;
  priority?: boolean;
}

export function ProductCard({ product, priority }: ProductCardProps) {
  const { add, ready } = useCart();
  const [loaded, setLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [cover, alt] = product.photos;
  const fabric = product.collection ? collectionLabel(product.collection) : "";
  const label = [fabric, product.colour].filter(Boolean).join(" · ");
  const imageAlt = [product.title, product.colour, fabric && `${fabric} saree`].filter(Boolean).join(", ");

  function quickAdd() {
    add({ slug: product.slug, title: product.title, price: product.price, image: cover ?? "", colour: product.colour, collection: fabric });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }

  const href = `/shop/sarees/${product.slug}`;
  return (
    <div className="group relative" data-testid="product-card">
      <div className={`relative aspect-[3/4] overflow-hidden rounded-[3px] ${loaded ? "bg-gold-wash" : "shimmer"}`}>
        <Link href={href} className="absolute inset-0" tabIndex={-1} aria-hidden>
          {cover && (
            <Image src={cover} alt={imageAlt} fill priority={priority} onLoad={() => setLoaded(true)}
              sizes="(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 48vw"
              className={`object-cover object-top transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.045] ${loaded ? "opacity-100" : "opacity-0"} ${alt ? "group-hover:opacity-0" : ""}`} />
          )}
          {alt && (
            <Image src={alt} alt="" fill sizes="(min-width: 1024px) 23vw, 48vw"
              className="object-cover object-top opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          )}
        </Link>
        {product.featured && <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[9px] font-bold tracking-[0.18em] text-ink backdrop-blur">FEATURED</span>}
        <button type="button" onClick={quickAdd} disabled={!ready} aria-label={`Add ${product.title} to bag`}
          className={`absolute right-2.5 bottom-2.5 flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-bold tracking-[0.14em] shadow-lg transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100 ${justAdded ? "bg-leaf text-white" : "bg-ink text-paper hover:bg-gold-bright hover:text-ink"}`}>
          {justAdded ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path className="draw-check" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <span className="text-base leading-none" aria-hidden>+</span>
          )}
          <span className="hidden sm:inline">{justAdded ? "ADDED" : "ADD"}</span>
        </button>
      </div>
      <Link href={href} className="mt-3 block space-y-0.5">
        {label && <p className="text-[10px] font-semibold tracking-[0.22em] text-gold uppercase">{label}</p>}
        <p className="text-[15px] leading-snug text-ink"><span className="link-grow">{product.title}</span></p>
        <p className="text-[15px] font-semibold">{formatPrice(product.price)}</p>
      </Link>
    </div>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: readonly StoreProduct[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <Reveal key={p.slug} delay={(i % 4) * 70}>
          <ProductCard product={p} priority={i < priorityCount} />
        </Reveal>
      ))}
    </div>
  );
}
