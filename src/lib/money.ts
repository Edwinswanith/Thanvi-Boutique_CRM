/** Money helpers. All amounts are integer paise. */

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatINR(paise: number, opts: { symbol?: boolean } = {}): string {
  const value = (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return opts.symbol === false ? value : `₹${value}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? belowHundred(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering (lakh, crore) — required wording on GST invoices. */
export function numberToWordsIN(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((n % 1_00_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${numberToWordsIN(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(" ");
}

export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const ps = paise % 100;
  return `Rupees ${numberToWordsIN(rupees)}${ps ? ` and ${belowHundred(ps)} Paise` : ""} Only`;
}

/** Short Indian-style amount for dashboards: ₹950, ₹45.2K, ₹3.4L, ₹1.25Cr. */
export function formatCompactINR(paise: number): string {
  const rupees = paise / 100;
  const abs = Math.abs(rupees);
  const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));
  if (abs >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000, 2)}Cr`;
  if (abs >= 1_00_000) return `₹${trim(rupees / 1_00_000, 2)}L`;
  if (abs >= 1000) return `₹${trim(rupees / 1000, 1)}K`;
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}
