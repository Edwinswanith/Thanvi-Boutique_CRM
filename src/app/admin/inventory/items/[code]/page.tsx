import type { Metadata } from "next";
import { Forbidden, PageHeader } from "@/components/admin/PageHeader";
import { AppError } from "@/lib/api";
import { can } from "@/server/actor";
import { pageActor } from "@/server/page";
import { listBins } from "@/server/services/bins";
import { itemHistory, lookupItem } from "@/server/services/items";
import { ItemCard } from "../../ScanLookup";
import { MoveBin } from "./MoveBin";

export const metadata: Metadata = { title: "Piece history" };

const LABELS: Record<string, string> = {
  receive: "Received from vendor",
  move_bin: "Moved to another bin",
  dispatch: "Dispatched (in transit)",
  transfer_receive: "Received at store",
  reserve: "Held for payment",
  release: "Hold released",
  sale: "Sold",
  status_change: "Status changed",
};

export default async function ItemPage({ params }: { params: Promise<{ code: string }> }) {
  const { actor, allowed } = await pageActor("inventory.view");
  if (!allowed) return <Forbidden />;
  const code = decodeURIComponent((await params).code);
  try {
    const [item, history] = await Promise.all([lookupItem(actor, code), itemHistory(actor, code)]);
    const bins = can(actor, "inventory.edit") ? await listBins(actor, item.location.id) : [];
    return (
      <>
        <PageHeader eyebrow="Inventory · Traceability" title={item.code} description="One piece, its whole life: from the vendor to the customer." />
        <div className="rise rise-1"><ItemCard item={item} /></div>
        {bins.length > 0 && ["available", "reserved", "damaged", "returned"].includes(item.status) && (
          <MoveBin code={item.code} bins={bins.map((b) => ({ id: b.id, code: b.code }))} currentBinId={item.bin?.id ?? null} />
        )}
        <section className="rise rise-2 mt-8">
          <h2 className="display mb-4 text-2xl">History</h2>
          <ol className="relative ml-3 border-l-2 border-gold/40">
            {history.map((h, i) => (
              <li key={i} className="mb-5 ml-6">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-gold bg-card" aria-hidden />
                <p className="font-semibold">{LABELS[h.type] ?? h.type} <span className="code ml-2 text-xs font-normal text-gold">{h.reference}</span></p>
                <p className="text-sm text-ink-soft">{h.from !== h.to ? `${h.from} → ${h.to}` : h.to}{h.note ? ` · ${h.note}` : ""}</p>
                <p className="text-xs text-ink-soft">{new Date(h.at).toLocaleString("en-IN")} · {h.actor}</p>
              </li>
            ))}
          </ol>
        </section>
      </>
    );
  } catch (err) {
    const msg = err instanceof AppError ? err.message : "Could not load this piece";
    return <div className="panel mx-auto mt-16 max-w-md p-8 text-center"><p className="display text-2xl">{msg}</p></div>;
  }
}
