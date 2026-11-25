import { formatINR } from "@/lib/money";
import type { CheckoutQuote } from "@/lib/storefront/checkout";

export function CheckoutTotals({ quote }: { quote: CheckoutQuote }) {
  const rows: [string, number][] = [["Items before GST", quote.merchandise], ["Shipping before GST", quote.shipping]];
  if (quote.igst) rows.push(["IGST", quote.igst]);
  else rows.push(["CGST", quote.cgst], ["SGST", quote.sgst]);
  if (quote.roundOff) rows.push(["Round-off", quote.roundOff]);
  return (
    <dl className="mt-4 space-y-2 text-sm" aria-label="Checkout totals">
      {rows.map(([label, amount]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd>{formatINR(amount)}</dd></div>)}
      <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold"><dt>Test total</dt><dd>{formatINR(quote.total)}</dd></div>
    </dl>
  );
}
