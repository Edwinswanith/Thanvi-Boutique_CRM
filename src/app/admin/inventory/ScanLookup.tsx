"use client";

import Link from "next/link";
import { useState } from "react";
import { Notice, ScanInput } from "@/components/admin/ui";
import { api } from "@/lib/http";
import { formatINR } from "@/lib/money";
import type { ItemView, MovementView } from "@/server/services/items";

/** Scan a tag → instant card showing the piece and exactly where it is. */
export function ScanLookup() {
  const [result, setResult] = useState<{ item: ItemView; history: MovementView[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(code: string) {
    setError(null);
    try {
      setResult(await api(`/api/items/${encodeURIComponent(code)}`));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Lookup failed");
    }
  }

  return (
    <div className="space-y-4">
      <ScanInput onScan={lookup} label="Find" autoFocus />
      {error && <Notice kind="err">{error}</Notice>}
      {result && <ItemCard item={result.item} />}
    </div>
  );
}

export function ItemCard({ item }: { item: ItemView }) {
  return (
    <article aria-label="Piece details" className="grid gap-5 rounded-lg border border-line bg-paper p-5 sm:grid-cols-[120px_1fr_auto]">
      <div className="aspect-[3/4] w-full overflow-hidden rounded bg-gold-wash">
        {item.photoIds[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo, not optimisable by next/image
          <img src={`/api/uploads/${item.photoIds[0]}`} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="zari h-full w-full opacity-30" aria-hidden />
        )}
      </div>
      <div>
        <p className="code text-sm text-gold">{item.code}</p>
        <p className="display text-2xl">{item.name}</p>
        <p className="text-sm text-ink-soft">{[item.category, item.color, item.fabric].filter(Boolean).join(" · ")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-ink-soft">MRP</dt><dd className="code">{formatINR(item.mrp)}</dd></div>
          {item.costPrice !== null && <div><dt className="text-xs text-ink-soft">Cost</dt><dd className="code">{formatINR(item.costPrice)}</dd></div>}
          <div><dt className="text-xs text-ink-soft">Vendor</dt><dd>{item.vendor.name} <span className="code text-xs">{item.vendor.code}</span></dd></div>
          <div><dt className="text-xs text-ink-soft">HSN</dt><dd className="code">{item.hsn}</dd></div>
          <div><dt className="text-xs text-ink-soft">Received</dt><dd className="code text-xs">{item.receiptRef}</dd></div>
        </dl>
      </div>
      <div className="flex min-w-[180px] flex-col items-start gap-2 rounded-md bg-ink p-4 text-paper sm:items-end sm:text-right">
        <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink">{item.status.replace("_", " ")}</span>
        <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50">{item.status === "sold" ? "Sold at" : item.status === "in_transit" ? "Heading to" : "Location"}</p>
        <p className="display text-xl leading-tight">{item.location.name}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50">Bin</p>
        <p className="code text-lg text-gold-bright">{item.bin ? item.bin.code : item.status === "sold" ? "With customer" : item.status === "in_transit" ? "On the way" : "Not shelved"}</p>
        <Link href={`/admin/inventory/items/${encodeURIComponent(item.code)}`} className="mt-1 text-xs underline underline-offset-4">
          Full history →
        </Link>
      </div>
    </article>
  );
}
