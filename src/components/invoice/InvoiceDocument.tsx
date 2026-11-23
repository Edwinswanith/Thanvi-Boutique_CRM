import { BrandLogo } from "@/components/BrandLogo";
import { stateName } from "@/lib/gst/states";
import { amountInWords, formatINR } from "@/lib/money";

/**
 * GST tax invoice renderer.
 *
 * WHEN THE CLIENT'S SAMPLE INVOICE ARRIVES: match it here. Business details,
 * title, terms, footer and which columns show come from GST & invoice settings
 * (snapshotted onto each invoice as `seller`). Layout changes go in the
 * `Classic` (A4) or `Compact` (80 mm thermal) components below, or add a new
 * template key in models/InvoiceSettings.ts and a component for it.
 */

export interface InvoiceLine {
  code?: string | null;
  name?: string | null;
  hsn?: string | null;
  mrp?: number | null;
  discount?: number | null;
  taxable?: number | null;
  rate?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  total?: number | null;
}

export interface InvoiceData {
  number: string;
  createdAt: string | Date;
  status: string;
  supplyType: "intra" | "inter";
  placeOfSupply: string;
  customer: { name?: string | null; phone?: string | null; gstin?: string | null; address?: string | null };
  lines: InvoiceLine[];
  totals: { mrp?: number | null; discount?: number | null; taxable?: number | null; cgst?: number | null; sgst?: number | null; igst?: number | null; roundOff?: number | null; grandTotal?: number | null };
  taxBreakup: { rate?: number | null; taxable?: number | null; cgst?: number | null; sgst?: number | null; igst?: number | null }[];
  payments: { mode: string; amount: number; reference?: string | null }[];
  salespersonName?: string | null;
  seller: {
    legalName: string; tradeName: string; address: string; phone: string; email: string; gstin: string; stateCode: string;
    title: string; terms: string; footer: string; signatureLabel: string; template: string; showHsn: boolean; showSalesperson: boolean;
    storeName: string; storeCode: string; storeAddress: string;
  };
}

const n = (v: number | null | undefined) => v ?? 0;
const money = (v: number | null | undefined) => formatINR(n(v), { symbol: false });

export function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  return invoice.seller.template === "compact" ? <Compact inv={invoice} /> : <Classic inv={invoice} />;
}

function Classic({ inv }: { inv: InvoiceData }) {
  const s = inv.seller;
  const inter = inv.supplyType === "inter";
  return (
    <article className="invoice-doc mx-auto max-w-[210mm] bg-white p-[12mm] text-[10pt] text-black">
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <BrandLogo tone="light" className="h-auto w-[30mm] shrink-0" />
        <div className="flex-1">
          <p className="display text-[20pt] leading-none">{s.tradeName || s.legalName}</p>
          {s.tradeName && s.legalName !== s.tradeName && <p className="text-[9pt]">{s.legalName}</p>}
          <p className="mt-1 max-w-[95mm] text-[9pt] whitespace-pre-line">{s.storeAddress || s.address}</p>
          <p className="text-[9pt]">{[s.phone, s.email].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-[9pt] font-semibold">GSTIN: {s.gstin || "—"} · State: {stateName(s.stateCode)} ({s.stateCode})</p>
        </div>
        <div className="text-right">
          <p className="text-[13pt] font-bold tracking-wide">{s.title}</p>
          <p className="code mt-1">No. {inv.number}</p>
          <p className="text-[9pt]">Date: {new Date(inv.createdAt).toLocaleString("en-IN")}</p>
          <p className="text-[9pt]">Store: {s.storeName} ({s.storeCode})</p>
          {inv.status !== "closed" && <p className="mt-1 text-[9pt] font-bold uppercase">{inv.status === "open" ? "Payment pending" : inv.status}</p>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 border-b border-black py-2 text-[9pt]">
        <div>
          <p className="font-semibold">Billed to</p>
          <p>{inv.customer.name || "Walk-in customer"}</p>
          {inv.customer.address && <p>{inv.customer.address}</p>}
          {inv.customer.phone && <p>Ph: {inv.customer.phone}</p>}
          {inv.customer.gstin && <p>GSTIN: {inv.customer.gstin}</p>}
        </div>
        <div className="text-right">
          <p>Place of supply: {stateName(inv.placeOfSupply)} ({inv.placeOfSupply})</p>
          <p>{inter ? "Inter-state supply (IGST)" : "Intra-state supply (CGST + SGST)"}</p>
          {s.showSalesperson && inv.salespersonName && <p>Billed by: {inv.salespersonName}</p>}
        </div>
      </section>

      <table className="mt-2 w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="border-y border-black text-left">
            <th className="py-1">#</th><th>Description</th>{s.showHsn && <th>HSN</th>}
            <th className="text-right">MRP</th><th className="text-right">Disc.</th><th className="text-right">Taxable</th><th className="text-right">GST%</th>
            {inter ? <th className="text-right">IGST</th> : <><th className="text-right">CGST</th><th className="text-right">SGST</th></>}
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={l.code ?? i} className="border-b border-black/20 align-top">
              <td className="py-1">{i + 1}</td>
              <td>{l.name}<br /><span className="code text-[7.5pt]">{l.code}</span></td>
              {s.showHsn && <td>{l.hsn}</td>}
              <td className="text-right">{money(l.mrp)}</td><td className="text-right">{money(l.discount)}</td>
              <td className="text-right">{money(l.taxable)}</td><td className="text-right">{l.rate}</td>
              {inter ? <td className="text-right">{money(l.igst)}</td> : <><td className="text-right">{money(l.cgst)}</td><td className="text-right">{money(l.sgst)}</td></>}
              <td className="text-right">{money(l.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-3 grid grid-cols-[1fr_70mm] gap-6">
        <div className="text-[8.5pt]">
          <p className="font-semibold">Tax summary</p>
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-black text-left"><th>Rate</th><th className="text-right">Taxable</th>{inter ? <th className="text-right">IGST</th> : <><th className="text-right">CGST</th><th className="text-right">SGST</th></>}</tr></thead>
            <tbody>{inv.taxBreakup.map((r) => <tr key={r.rate}><td>{r.rate}%</td><td className="text-right">{money(r.taxable)}</td>{inter ? <td className="text-right">{money(r.igst)}</td> : <><td className="text-right">{money(r.cgst)}</td><td className="text-right">{money(r.sgst)}</td></>}</tr>)}</tbody>
          </table>
          <p className="mt-3 font-semibold">{amountInWords(n(inv.totals.grandTotal))}</p>
          {inv.payments.length > 0 && <p className="mt-1">Paid by: {inv.payments.map((p) => `${p.mode.toUpperCase()} ${formatINR(p.amount)}${p.reference ? ` (${p.reference})` : ""}`).join(", ")}</p>}
        </div>
        <dl className="space-y-0.5 text-[9pt]">
          {[["Total MRP", inv.totals.mrp], ["Less discount", n(inv.totals.discount) ? -n(inv.totals.discount) : 0], ["Taxable value", inv.totals.taxable],
            ...(inter ? [["IGST", inv.totals.igst]] : [["CGST", inv.totals.cgst], ["SGST", inv.totals.sgst]]), ["Round off", inv.totals.roundOff]].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between"><dt>{k}</dt><dd>{money(v as number)}</dd></div>
          ))}
          <div className="flex justify-between border-y-2 border-black py-1 text-[12pt] font-bold"><dt>Grand total</dt><dd>₹{money(inv.totals.grandTotal)}</dd></div>
        </dl>
      </section>

      <footer className="mt-8 grid grid-cols-2 items-end gap-6 text-[8pt]">
        <p className="whitespace-pre-line">{s.terms}</p>
        <div className="text-right"><p className="font-semibold">For {s.legalName}</p><div className="h-10" /><p>{s.signatureLabel}</p></div>
        <p className="col-span-2 text-center">{s.footer}</p>
      </footer>
    </article>
  );
}

function Compact({ inv }: { inv: InvoiceData }) {
  const s = inv.seller;
  const inter = inv.supplyType === "inter";
  return (
    <article className="invoice-doc mx-auto w-[80mm] bg-white p-[3mm] text-[8pt] leading-snug text-black">
      <p className="text-center text-[12pt] font-bold">{s.tradeName || s.legalName}</p>
      <p className="text-center">{s.storeAddress || s.address}</p>
      <p className="text-center">GSTIN {s.gstin}</p>
      <p className="mt-1 border-y border-dashed border-black py-0.5 text-center font-bold">{s.title}</p>
      <p>No: {inv.number}<br />Date: {new Date(inv.createdAt).toLocaleString("en-IN")}</p>
      {inv.customer.name && <p>To: {inv.customer.name} {inv.customer.gstin}</p>}
      <table className="mt-1 w-full">
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={l.code ?? i} className="align-top"><td>{l.name} <span className="code">{l.code}</span>{s.showHsn && <> HSN {l.hsn}</>} @{l.rate}%</td><td className="text-right">{money(l.total)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 border-t border-dashed border-black pt-1">
        <p className="flex justify-between"><span>Taxable</span><span>{money(inv.totals.taxable)}</span></p>
        {inter ? <p className="flex justify-between"><span>IGST</span><span>{money(inv.totals.igst)}</span></p> : <>
          <p className="flex justify-between"><span>CGST</span><span>{money(inv.totals.cgst)}</span></p>
          <p className="flex justify-between"><span>SGST</span><span>{money(inv.totals.sgst)}</span></p></>}
        <p className="flex justify-between"><span>Discount</span><span>{money(inv.totals.discount)}</span></p>
        <p className="flex justify-between text-[11pt] font-bold"><span>TOTAL</span><span>₹{money(inv.totals.grandTotal)}</span></p>
      </div>
      <p className="mt-1">{amountInWords(n(inv.totals.grandTotal))}</p>
      <p className="mt-2 text-center">{s.footer}</p>
    </article>
  );
}
