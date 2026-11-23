import { describe, expect, it } from "vitest";
import {
  allocate,
  calculateInvoice,
  discountAmount,
  findRule,
  stateFromGstin,
  supplyTypeFor,
  taxForPrice,
  type TaxRuleInput,
} from "@/lib/gst/engine";
import { amountInWords, formatINR, numberToWordsIN, toPaise } from "@/lib/money";
import { DEFAULT_TAX_RULES } from "@/server/seed/migrations";

const rules: TaxRuleInput[] = DEFAULT_TAX_RULES;
const inclusive = { pricesIncludeTax: true, supplyType: "intra" as const, roundToRupee: true };

describe("rule matching", () => {
  it("uses the longest HSN prefix", () => {
    const custom = [...rules, { name: "Silk special", hsnPrefixes: ["5007"], slabs: [{ upTo: null, rate: 12 }] }];
    expect(findRule("50072010", custom).name).toBe("Silk special");
    expect(findRule("5208", custom).name).toBe("Sarees & fabrics");
    expect(findRule("6204 42", custom).name).toBe("Readymade garments");
  });

  it("fails clearly when no rule covers the HSN", () => {
    expect(() => findRule("9999", rules)).toThrow("No GST rule covers HSN 9999");
  });
});

describe("slab selection", () => {
  const apparel = rules[1].slabs;

  it("picks 5% when inclusive price keeps taxable value within ₹2,500", () => {
    // ₹2,625 incl. 5% → taxable ₹2,500 exactly
    expect(taxForPrice(262_500, apparel, true)).toEqual({ rate: 5, taxable: 250_000, tax: 12_500 });
  });

  it("moves to 18% once taxable value crosses the threshold", () => {
    const r = taxForPrice(300_000, apparel, true);
    expect(r.rate).toBe(18);
    expect(r.taxable).toBe(254_237);
    expect(r.taxable + r.tax).toBe(300_000);
  });

  it("adds tax on top when prices exclude tax", () => {
    expect(taxForPrice(100_000, apparel, false)).toEqual({ rate: 5, taxable: 100_000, tax: 5_000 });
    expect(taxForPrice(300_000, apparel, false)).toEqual({ rate: 18, taxable: 300_000, tax: 54_000 });
  });

  it("rejects empty slabs", () => {
    expect(() => taxForPrice(100, [], true)).toThrow();
  });
});

describe("discounts", () => {
  it("handles percent, flat and caps", () => {
    expect(discountAmount(10_000, { type: "percent", value: 10 })).toBe(1_000);
    expect(discountAmount(10_000, { type: "flat", value: 2_500 })).toBe(2_500);
    expect(discountAmount(10_000, { type: "flat", value: 99_999 })).toBe(10_000);
    expect(discountAmount(10_000, { type: "percent", value: 150 })).toBe(10_000);
    expect(discountAmount(10_000, null)).toBe(0);
  });

  it("allocates bill discounts exactly", () => {
    const shares = allocate(1_000, [3_333, 3_333, 3_334]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1_000);
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
  });
});

describe("calculateInvoice", () => {
  it("computes GST on the discounted price, not the MRP", () => {
    const calc = calculateInvoice(
      [{ key: "a", hsn: "5007", mrp: toPaise(10_500), discount: { type: "percent", value: 10 } }],
      rules,
      inclusive,
    );
    const line = calc.lines[0];
    expect(line.price).toBe(toPaise(9_450));
    expect(line.rate).toBe(5);
    expect(line.taxable).toBe(900_000);
    expect(line.cgst + line.sgst).toBe(45_000);
    expect(calc.totals.grandTotal).toBe(toPaise(9_450));
  });

  it("drops a garment into the 5% slab when the discount brings it under ₹2,500", () => {
    const noDisc = calculateInvoice([{ key: "a", hsn: "6204", mrp: 300_000 }], rules, inclusive);
    const disc = calculateInvoice([{ key: "a", hsn: "6204", mrp: 300_000, discount: { type: "flat", value: 50_000 } }], rules, inclusive);
    expect(noDisc.lines[0].rate).toBe(18);
    expect(disc.lines[0].rate).toBe(5);
  });

  it("splits intra-state into CGST+SGST and inter-state into IGST", () => {
    const lines = [{ key: "a", hsn: "5208", mrp: 105_001 }];
    const intra = calculateInvoice(lines, rules, inclusive);
    const inter = calculateInvoice(lines, rules, { ...inclusive, supplyType: "inter" });
    expect(intra.lines[0].cgst + intra.lines[0].sgst).toBe(inter.lines[0].igst);
    expect(inter.lines[0].cgst).toBe(0);
    expect(Math.abs(intra.lines[0].cgst - intra.lines[0].sgst)).toBeLessThanOrEqual(1);
  });

  it("applies a bill discount, groups tax by rate and rounds to the rupee", () => {
    const calc = calculateInvoice(
      [
        { key: "a", hsn: "5007", mrp: 499_900 },
        { key: "b", hsn: "6204", mrp: 199_950 },
        { key: "c", hsn: "6204", mrp: 400_000 },
      ],
      rules,
      { ...inclusive, billDiscount: { type: "percent", value: 5 } },
    );
    expect(calc.totals.discount).toBe(Math.round(1_099_850 * 0.05));
    expect(calc.taxBreakup.map((r) => r.rate)).toEqual([5, 18]);
    expect(calc.totals.grandTotal % 100).toBe(0);
    expect(calc.totals.grandTotal - calc.totals.roundOff).toBe(calc.lines.reduce((a, l) => a + l.total, 0));
    expect(calc.totals.taxable + calc.totals.cgst + calc.totals.sgst).toBe(calc.lines.reduce((a, l) => a + l.total, 0));
  });

  it("refuses an empty bill", () => {
    expect(() => calculateInvoice([], rules, inclusive)).toThrow("at least one");
  });
});

describe("state & supply", () => {
  it("reads the state from a GSTIN and decides supply type", () => {
    expect(stateFromGstin("33AAAAA0000A1Z5")).toBe("33");
    expect(stateFromGstin("bad")).toBeNull();
    expect(supplyTypeFor("33", "33")).toBe("intra");
    expect(supplyTypeFor("33", "29")).toBe("inter");
    expect(supplyTypeFor("33", null)).toBe("intra");
  });
});

describe("money", () => {
  it("formats rupees and words in Indian style", () => {
    expect(formatINR(12_345_678)).toBe("₹1,23,456.78");
    expect(formatINR(500, { symbol: false })).toBe("5.00");
    expect(numberToWordsIN(0)).toBe("Zero");
    expect(numberToWordsIN(1_25_50_011)).toBe("One Crore Twenty Five Lakh Fifty Thousand Eleven");
    expect(numberToWordsIN(999)).toBe("Nine Hundred Ninety Nine");
    expect(amountInWords(945_050)).toBe("Rupees Nine Thousand Four Hundred Fifty and Fifty Paise Only");
  });
});
