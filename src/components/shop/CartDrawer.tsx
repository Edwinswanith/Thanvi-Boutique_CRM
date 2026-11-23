"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { formatPrice } from "@/lib/storefront/collections";
import { useCart } from "./CartProvider";

/** Slides in after "Add to bag" so shoppers get instant confirmation without leaving the page. */
export function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, lastAdded, subtotal, count } = useCart();
  const pathname = usePathname();
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const added = lines.find((l) => l.slug === lastAdded);

  useEffect(() => { closeDrawer(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps -- close on navigation only

  useEffect(() => {
    if (!drawerOpen) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;
  const others = lines.filter((l) => l.slug !== lastAdded);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button type="button" aria-label="Close bag" onClick={closeDrawer} className="fade-in absolute inset-0 cursor-default bg-ink/45 backdrop-blur-[2px]" />
      <aside className="slide-in-right absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-paper shadow-2xl">
        <div className="zari h-1" aria-hidden />
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <p id="drawer-title" className="flex items-center gap-2 font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-leaf text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden><path className="draw-check" d="M5 13l4 4L19 7" /></svg>
            </span>
            Added to your bag
          </p>
          <button type="button" onClick={closeDrawer} className="grid h-8 w-8 place-items-center rounded-full text-xl text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink" aria-label="Close">×</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {added && (
            <div className="pop-in flex gap-4">
              <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[3px] bg-gold-wash">
                {added.image && <Image src={added.image} alt={added.title} fill sizes="96px" className="object-cover object-top" />}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{[added.collection, added.colour].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 leading-snug">{added.title}</p>
                <p className="mt-1 font-semibold">{formatPrice(added.price)}</p>
                <p className="mt-1 text-xs text-ink-soft">Qty {added.qty}</p>
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Also in your bag</p>
              <ul className="mt-3 space-y-3">
                {others.slice(0, 4).map((l) => (
                  <li key={l.slug} className="flex items-center gap-3 text-sm">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-[2px] bg-gold-wash">
                      {l.image && <Image src={l.image} alt="" fill sizes="36px" className="object-cover object-top" />}
                    </div>
                    <span className="flex-1 truncate">{l.title}</span>
                    <span className="text-ink-soft">×{l.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="border-t border-line px-5 py-5">
          <p className="flex justify-between text-sm"><span>Subtotal · {count} item{count === 1 ? "" : "s"}</span><span className="font-semibold">{formatPrice(subtotal)}</span></p>
          <div className="mt-4 grid gap-2">
            <Link ref={primaryRef} href="/shop/bag" className="btn btn-gold py-3 tracking-[0.14em]">VIEW BAG</Link>
            <button type="button" onClick={closeDrawer} className="btn btn-ghost py-3 tracking-[0.14em]">CONTINUE SHOPPING</button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
