"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addLine, cartCount, cartSubtotal, parseCart, refreshLines, removeLine, setQty, type CartItem, type CartLine } from "@/lib/storefront/cart";

const STORAGE_KEY = "tb_bag_v2";

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  /** Increments on every add, so the bag icon can replay its bump animation. */
  bumpKey: number;
  drawerOpen: boolean;
  lastAdded: string | null;
  add: (item: CartItem, opts?: { openDrawer?: boolean }) => void;
  update: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  closeDrawer: () => void;
  /** Re-checks prices/availability against the live site. Returns titles removed. */
  refresh: () => Promise<string[]>;
}

const CartContext = createContext<CartState | null>(null);

function readStored(): CartLine[] {
  try {
    return parseCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeStored(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage blocked (private mode): the bag still works for this visit */
  }
}

/** Bag kept in the browser. Phase 3 adds a server cart with stock reservation. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    setLines(readStored());
    setReady(true);
  }, []);

  const commit = useCallback((next: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const updated = next(prev);
      writeStored(updated);
      return updated;
    });
  }, []);

  const refresh = useCallback(async (): Promise<string[]> => {
    const current = readStored();
    if (current.length === 0) return [];
    const res = await fetch(`/api/shop/products?slugs=${encodeURIComponent(current.map((l) => l.slug).join(","))}`).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { success?: boolean; data?: CartItem[] } | null;
    if (!json?.success || !json.data) return [];
    const { lines: fresh, removed } = refreshLines(current, json.data);
    commit(() => fresh);
    return removed;
  }, [commit]);

  const value = useMemo<CartState>(() => ({
    lines,
    count: cartCount(lines),
    subtotal: cartSubtotal(lines),
    ready,
    bumpKey,
    drawerOpen,
    lastAdded,
    add: (item, opts) => {
      commit((prev) => addLine(prev, item));
      setBumpKey((k) => k + 1);
      setLastAdded(item.slug);
      if (opts?.openDrawer !== false) setDrawerOpen(true);
    },
    update: (slug, qty) => commit((prev) => setQty(prev, slug, qty)),
    remove: (slug) => commit((prev) => removeLine(prev, slug)),
    closeDrawer: () => setDrawerOpen(false),
    refresh,
  }), [lines, ready, bumpKey, drawerOpen, lastAdded, commit, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
