"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CartItem } from "@/lib/storefront/cart";
import { formatPrice } from "@/lib/storefront/collections";
import { useCart } from "./CartProvider";

type Phase = "idle" | "adding" | "added";

function useAddFlow(item: CartItem) {
  const { add, ready } = useCart();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function addToBag() {
    if (phase !== "idle") return;
    setPhase("adding");
    timers.current.push(window.setTimeout(() => {
      add(item);
      setPhase("added");
      timers.current.push(window.setTimeout(() => setPhase("idle"), 1800));
    }, 320));
  }
  return { phase, ready, addToBag, add };
}

function AddLabel({ phase }: { phase: Phase }) {
  if (phase === "adding") return <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> ADDING</>;
  if (phase === "added") return (
    <span className="pop-in flex items-center gap-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><path className="draw-check" d="M5 13l4 4L19 7" /></svg>
      ADDED
    </span>
  );
  return <>ADD TO BAG</>;
}

export function AddToBag({ item }: { item: CartItem }) {
  const router = useRouter();
  const { phase, ready, addToBag, add } = useAddFlow(item);
  const sentinel = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function buyNow() {
    add(item, { openDrawer: false, onlyIfMissing: true });
    router.push("/shop/bag");
  }

  if (item.availableQuantity === 0) return <p className="font-semibold">Sold out</p>;

  return (
    <>
      <div ref={sentinel} className="grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={!ready} onClick={addToBag} aria-live="polite"
          className={`btn py-3.5 tracking-[0.14em] transition-colors duration-300 ${phase === "added" ? "bg-leaf text-white" : "btn-primary"}`}>
          <AddLabel phase={phase} />
        </button>
        <button type="button" disabled={!ready} onClick={buyNow} className="btn btn-gold py-3.5 tracking-[0.14em]">BUY NOW</button>
      </div>

      <div aria-hidden={!showBar}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 py-3 shadow-[0_-10px_30px_-20px_rgba(0,0,0,.5)] backdrop-blur transition-transform duration-300 lg:hidden ${showBar ? "translate-y-0" : "translate-y-full"}`}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{item.title}</p>
            <p className="text-sm font-semibold">{formatPrice(item.price)}</p>
          </div>
          <button type="button" tabIndex={showBar ? 0 : -1} disabled={!ready} onClick={addToBag}
            className={`btn shrink-0 px-5 py-3 text-xs tracking-[0.14em] ${phase === "added" ? "bg-leaf text-white" : "btn-primary"}`}>
            <AddLabel phase={phase} />
          </button>
        </div>
      </div>
    </>
  );
}
