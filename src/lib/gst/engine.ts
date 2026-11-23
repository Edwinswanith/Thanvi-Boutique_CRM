/**
 * Pure GST calculation engine. All money is integer paise.
 * Used by the POS for live previews and by the server as the source of truth.
 */

export interface TaxSlab {
  /** Upper bound (inclusive) of taxable value per piece in paise; null = unbounded. */
  upTo: number | null;
  rate: number;
}

export interface TaxRuleInput {
  name: string;
  hsnPrefixes: readonly string[];
  slabs: readonly TaxSlab[];
}

export type Discount = { type: "percent"; value: number } | { type: "flat"; value: number };

export interface LineInput {
  key: string;
  hsn: string;
  /** Tag price (MRP) in paise. */
  mrp: number;
  discount?: Discount | null;
}

export interface CalcOptions {
  pricesIncludeTax: boolean;
  supplyType: "intra" | "inter";
  roundToRupee: boolean;
  billDiscount?: Discount | null;
}

export interface LineResult {
  key: string;
  hsn: string;
  mrp: number;
  discount: number;
  /** Final selling price of the piece after all discounts (what the customer pays for it, pre round-off). */
  price: number;
  taxable: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  ruleName: string;
}

export interface TaxBreakupRow {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface InvoiceCalc {
  lines: LineResult[];
  taxBreakup: TaxBreakupRow[];
  totals: { mrp: number; discount: number; taxable: number; cgst: number; sgst: number; igst: number; roundOff: number; grandTotal: number };
}

export class GstError extends Error {}

export function findRule(hsn: string, rules: readonly TaxRuleInput[]): TaxRuleInput {
  const clean = hsn.replace(/\s/g, "");
  let best: { rule: TaxRuleInput; len: number } | null = null;
  for (const rule of rules) {
    for (const prefix of rule.hsnPrefixes) {
      if (clean.startsWith(prefix) && (!best || prefix.length > best.len)) best = { rule, len: prefix.length };
    }
  }
  if (!best) throw new GstError(`No GST rule covers HSN ${hsn}. Add one in GST settings.`);
  return best.rule;
}

function sortedSlabs(slabs: readonly TaxSlab[]): TaxSlab[] {
  return [...slabs].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
}

/** Returns rate and taxable value for one piece at final `price`. */
export function taxForPrice(price: number, slabs: readonly TaxSlab[], inclusive: boolean): { rate: number; taxable: number; tax: number } {
  if (!slabs.length) throw new GstError("Tax rule has no slabs");
  for (const slab of sortedSlabs(slabs)) {
    const taxable = inclusive ? Math.round((price * 100) / (100 + slab.rate)) : price;
    if (slab.upTo === null || taxable <= slab.upTo) {
      const tax = inclusive ? price - taxable : Math.round((taxable * slab.rate) / 100);
      return { rate: slab.rate, taxable, tax };
    }
  }
  throw new GstError("No slab matched");
}

export function discountAmount(base: number, discount: Discount | null | undefined): number {
  if (!discount || discount.value <= 0) return 0;
  const raw = discount.type === "percent" ? Math.round((base * Math.min(discount.value, 100)) / 100) : Math.round(discount.value);
  return Math.min(Math.max(raw, 0), base);
}

/** Spreads a bill-level discount across lines in proportion to their price (largest remainder). */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0 || total === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let rest = total - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  const out = [...floored];
  for (const { i } of order) {
    if (rest <= 0) break;
    out[i] += 1;
    rest -= 1;
  }
  return out;
}

function splitTax(tax: number, supplyType: "intra" | "inter") {
  if (supplyType === "inter") return { cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { cgst, sgst: tax - cgst, igst: 0 };
}

export function calculateInvoice(lines: readonly LineInput[], rules: readonly TaxRuleInput[], opts: CalcOptions): InvoiceCalc {
  if (!lines.length) throw new GstError("Add at least one item");
  const afterLine = lines.map((l) => l.mrp - discountAmount(l.mrp, l.discount));
  const billTotal = discountAmount(afterLine.reduce((a, b) => a + b, 0), opts.billDiscount);
  const billShares = allocate(billTotal, afterLine);

  const results: LineResult[] = lines.map((l, i) => {
    const price = afterLine[i] - billShares[i];
    const rule = findRule(l.hsn, rules);
    const { rate, taxable, tax } = taxForPrice(price, rule.slabs, opts.pricesIncludeTax);
    const parts = splitTax(tax, opts.supplyType);
    return { key: l.key, hsn: l.hsn, mrp: l.mrp, discount: l.mrp - price, price, taxable, rate, ...parts, total: taxable + tax, ruleName: rule.name };
  });
  return { lines: results, taxBreakup: breakup(results), totals: totalsOf(results, opts.roundToRupee) };
}

function breakup(lines: readonly LineResult[]): TaxBreakupRow[] {
  const byRate = new Map<number, TaxBreakupRow>();
  for (const l of lines) {
    const row = byRate.get(l.rate) ?? { rate: l.rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    byRate.set(l.rate, { rate: l.rate, taxable: row.taxable + l.taxable, cgst: row.cgst + l.cgst, sgst: row.sgst + l.sgst, igst: row.igst + l.igst });
  }
  return [...byRate.values()].sort((a, b) => a.rate - b.rate);
}

function totalsOf(lines: readonly LineResult[], roundToRupee: boolean): InvoiceCalc["totals"] {
  const sum = (f: (l: LineResult) => number) => lines.reduce((a, l) => a + f(l), 0);
  const exact = sum((l) => l.total);
  const grandTotal = roundToRupee ? Math.round(exact / 100) * 100 : exact;
  return {
    mrp: sum((l) => l.mrp),
    discount: sum((l) => l.discount),
    taxable: sum((l) => l.taxable),
    cgst: sum((l) => l.cgst),
    sgst: sum((l) => l.sgst),
    igst: sum((l) => l.igst),
    roundOff: grandTotal - exact,
    grandTotal,
  };
}

/** GSTIN's first two digits are the state code. */
export function stateFromGstin(gstin: string): string | null {
  return /^\d{2}[A-Z0-9]{13}$/.test(gstin) ? gstin.slice(0, 2) : null;
}

export function supplyTypeFor(sellerState: string, buyerState: string | null | undefined): "intra" | "inter" {
  return !buyerState || buyerState === sellerState ? "intra" : "inter";
}
