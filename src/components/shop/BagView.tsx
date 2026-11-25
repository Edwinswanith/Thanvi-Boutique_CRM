"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { quantityLimit, type CartLine } from "@/lib/storefront/cart";
import { formatPrice } from "@/lib/storefront/collections";
import { useCart } from "./CartProvider";

const EXIT_MS = 260;

export function BagView({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const { lines, subtotal, count, ready, update, remove, refresh } = useCart();
  const [leaving, setLeaving] = useState<string | null>(null);
  const [removedNotice, setRemovedNotice] = useState<string[]>([]);

  useEffect(() => {
    if (ready) void refresh().then(setRemovedNotice);
  }, [ready, refresh]);

  function removeAnimated(slug: string) {
    setLeaving(slug);
    window.setTimeout(() => { remove(slug); setLeaving(null); }, EXIT_MS);
  }

  if (!ready) return <div className="shimmer h-64 rounded-lg" aria-busy />;

  if (lines.length === 0) {
    return (
      <div className="panel pop-in mx-auto max-w-lg p-10 text-center">
        <svg className="mx-auto text-gold" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        <p className="display mt-4 text-2xl">Your bag is empty</p>
        <p className="mt-2 text-ink-soft">Find a weave you love and it will wait for you here.</p>
        <Link href="/shop/sarees" className="btn btn-gold mt-6 px-7 py-3 tracking-[0.12em]">SHOP SAREES</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="self-start">
        {removedNotice.length > 0 && (
          <p role="status" className="pop-in mb-4 rounded-md border border-gold/40 bg-gold-wash px-3 py-2 text-sm">
            No longer available online, so removed from your bag: {removedNotice.join(", ")}.
          </p>
        )}
        <ul className="divide-y divide-line border-y border-line" aria-label="Bag items">
          {lines.map((l) => <BagLine key={l.slug} line={l} leaving={leaving === l.slug} onQty={(q) => update(l.slug, q)} onRemove={() => removeAnimated(l.slug)} />)}
        </ul>
      </div>

      <aside className="panel h-fit p-6 lg:sticky lg:top-36">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold">ORDER SUMMARY</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Items</dt><dd key={count} className="count-pop">{count}</dd></div>
          <div className="flex justify-between"><dt>Subtotal</dt><dd key={subtotal} data-testid="bag-subtotal" className="fade-in font-semibold">{formatPrice(subtotal)}</dd></div>
        </dl>
        <div className="zari-rule my-5" />
        {checkoutEnabled ? (
          <Link href="/shop/checkout" className="btn btn-gold w-full py-3.5 tracking-[0.14em]">Checkout</Link>
        ) : (
          <button type="button" disabled className="btn btn-gold w-full py-3.5 tracking-[0.14em]">Checkout</button>
        )}
        <p className="mt-4 text-xs text-ink-soft">Exchange only · no refunds</p>
      </aside>
    </div>
  );
}

interface BagLineProps {
  line: CartLine;
  leaving: boolean;
  onQty: (qty: number) => void;
  onRemove: () => void;
}

function BagLine({ line, leaving, onQty, onRemove }: BagLineProps) {
  const href = `/shop/sarees/${line.slug}`;
  return (
    <li className={`grid grid-cols-[88px_1fr] gap-4 overflow-hidden transition-all ease-out sm:grid-cols-[110px_1fr_auto] ${leaving ? "max-h-0 -translate-x-6 py-0 opacity-0" : "max-h-72 py-5 opacity-100"}`}
      style={{ transitionDuration: `${EXIT_MS}ms` }}>
      <Link href={href} className="group relative aspect-[3/4] overflow-hidden rounded-[3px] bg-gold-wash">
        {line.image && <Image src={line.image} alt={line.title} fill sizes="110px" className="object-cover object-top transition-transform duration-500 group-hover:scale-105" />}
      </Link>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] text-gold uppercase">{[line.collection, line.colour].filter(Boolean).join(" · ")}</p>
        <Link href={href} className="mt-1 block text-[15px]"><span className="link-grow">{line.title}</span></Link>
        <p className="mt-1 font-semibold">{formatPrice(line.price)}</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center rounded-full border border-line-strong">
            <button type="button" onClick={() => (line.qty > 1 ? onQty(line.qty - 1) : onRemove())} className="h-8 w-8 rounded-full text-lg transition-colors hover:bg-ink/5 active:scale-90" aria-label={`One less ${line.title}`}>−</button>
            <span key={line.qty} className="count-pop w-6 text-center text-sm tabular-nums" aria-label="Quantity">{line.qty}</span>
            <button type="button" onClick={() => onQty(line.qty + 1)} disabled={line.qty >= quantityLimit(line)} className="h-8 w-8 rounded-full text-lg transition-colors hover:bg-ink/5 active:scale-90 disabled:opacity-30" aria-label={`One more ${line.title}`}>+</button>
          </div>
          <button type="button" onClick={onRemove} className="text-xs text-ink-soft underline underline-offset-4 transition-colors hover:text-madder">Remove</button>
        </div>
      </div>
      <p key={line.qty} className="fade-in hidden font-semibold sm:block">{formatPrice(line.price * line.qty)}</p>
    </li>
  );
}
