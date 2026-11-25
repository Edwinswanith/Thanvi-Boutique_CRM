import type { Metadata } from "next";
import { Forbidden } from "@/components/admin/PageHeader";
import { Barcode } from "@/components/Barcode";
import { LABELS_PER_SHEET } from "@/lib/code39";
import { formatINR } from "@/lib/money";
import { pageActor } from "@/server/page";
import { lookupItem, type ItemView } from "@/server/services/items";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Barcode labels" };

/** Printable sheet of Code 39 tags. Sized for 50×25 mm thermal labels; also prints on A4. */
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ codes?: string }> }) {
  const { actor, allowed } = await pageActor("inventory.view");
  if (!allowed) return <Forbidden />;
  const codes = [...new Set(((await searchParams).codes ?? "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean))].slice(0, LABELS_PER_SHEET);
  const items = (await Promise.all(codes.map((c) => lookupItem(actor, c).catch(() => null)))).filter((i): i is ItemView => i !== null);

  return (
    <div>
      <style>{`@media print { aside, #sidebar, .no-print, nextjs-portal { display:none !important } main { margin:0 !important; padding:0 !important } body::before { display:none } .label-sheet { gap: 2mm !important } }`}</style>
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="display text-3xl">Barcode labels</h1>
          <p className="text-sm text-ink-soft">{items.length} label(s) · Code 39</p>
        </div>
        <PrintButton />
      </div>
      <div className="label-sheet grid grid-cols-[repeat(auto-fill,minmax(50mm,1fr))] gap-3">
        {items.map((it) => (
          <div key={it.code} className="flex h-[25mm] w-[50mm] flex-col justify-between overflow-hidden border border-line bg-white px-[2mm] py-[1.5mm] text-ink break-inside-avoid">
            <div className="flex items-baseline justify-between text-[7pt] leading-none">
              <span className="font-bold tracking-[0.12em]">THANVI</span>
              <span className="code font-semibold">{formatINR(it.mrp)}</span>
            </div>
            <p className="truncate text-[6pt] leading-tight">{it.name}</p>
            <Barcode value={it.code} height={6} className="[&_svg]:h-[12mm] [&_svg]:w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
