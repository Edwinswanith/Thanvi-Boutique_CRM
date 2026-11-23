"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { collectionLabel, type CollectionKey } from "@/lib/storefront/collections";
import { useCart } from "./CartProvider";
import { LinkPending } from "./LinkPending";

function BagLink() {
  const { count, ready, bumpKey } = useCart();
  return (
    <Link href="/shop/bag" className="relative flex items-center gap-2 text-sm text-paper/85 transition-colors hover:text-paper" aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>
      <svg key={`bump-${bumpKey}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className={bumpKey > 0 ? "bump" : ""}>
        <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <span className="hidden sm:inline">Bag</span>
      {ready && count > 0 && (
        <span key={`count-${count}`} data-testid="bag-count" className="count-pop absolute -top-2 left-3.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-bright px-1 text-[11px] font-bold text-ink">
          {count}
        </span>
      )}
    </Link>
  );
}

function NavLinks({ collections }: { collections: CollectionKey[] }) {
  const pathname = usePathname();
  const current = useSearchParams().get("fabric") ?? undefined;
  const onCollection = pathname === "/shop/sarees";
  const items = [{ key: undefined, label: "All sarees" }, ...collections.map((k) => ({ key: k as string, label: collectionLabel(k) }))];
  return (
    <nav aria-label="Shop by fabric" className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 text-[13px] tracking-[0.12em] uppercase">
      {items.map((n) => {
        const active = onCollection && n.key === current;
        return (
          <Link key={n.label} href={n.key ? `/shop/sarees?fabric=${n.key}` : "/shop/sarees"} aria-current={active ? "page" : undefined}
            className={`relative shrink-0 py-3 transition-colors ${active ? "text-gold-bright" : "text-paper/70 hover:text-paper"}`}>
            {n.label}
            <LinkPending />
            <span className={`absolute inset-x-0 bottom-0 h-px origin-left bg-gold-bright transition-transform duration-300 ${active ? "scale-x-100" : "scale-x-0"}`} aria-hidden />
          </Link>
        );
      })}
    </nav>
  );
}

export function ShopHeader({ collections }: { collections: CollectionKey[] }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 bg-ink text-paper transition-shadow duration-300 ${scrolled ? "shadow-[0_10px_30px_-18px_rgba(0,0,0,.7)]" : ""}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 transition-[padding] duration-300 sm:px-6 ${scrolled ? "pt-1.5" : "pt-3"}`}>
        <Link href="/shop" aria-label="Thanvi Boutique home" className="shrink-0">
          <BrandLogo tone="dark" priority className={`h-auto transition-[width] duration-300 ${scrolled ? "w-[78px] sm:w-[88px]" : "w-[104px] sm:w-[124px]"}`} />
        </Link>
        <p className={`hidden text-[11px] tracking-[0.42em] text-gold-bright transition-opacity duration-300 md:block ${scrolled ? "opacity-0" : "opacity-100"}`}>WRAP YOURSELF IN ELEGANCE</p>
        <BagLink />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Suspense fallback={<div className="h-[45px]" />}>
          <NavLinks collections={collections} />
        </Suspense>
      </div>
      <div className="zari h-1" aria-hidden />
    </header>
  );
}
