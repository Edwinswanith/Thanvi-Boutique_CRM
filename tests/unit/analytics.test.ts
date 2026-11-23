import { describe, expect, it } from "vitest";
import { forecastSales, type DayPoint } from "@/lib/analytics/forecast";
import { addDays, fillDays, istDay, parseRange, pctChange, rangeWindow, startOfIstDay } from "@/lib/analytics/periods";

function series(days: number, amountFor: (i: number, date: string) => number, end = "2026-11-22"): DayPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(end, i - days + 1);
    return { date, amount: amountFor(i, date) };
  });
}

describe("periods", () => {
  it("buckets days in Indian time, not UTC", () => {
    expect(istDay(new Date("2026-11-22T19:00:00Z"))).toBe("2026-11-23");
    expect(istDay(new Date("2026-11-22T18:00:00Z"))).toBe("2026-11-22");
    expect(startOfIstDay(new Date("2026-11-22T19:00:00Z")).toISOString()).toBe("2026-11-22T18:30:00.000Z");
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("builds the current and previous windows for a range", () => {
    const w = rangeWindow("7d", new Date("2026-11-23T06:00:00Z"));
    expect(w.days).toHaveLength(7);
    expect(w.days[0]).toBe("2026-11-17");
    expect(w.days[6]).toBe("2026-11-23");
    expect(w.from.toISOString()).toBe("2026-11-16T18:30:00.000Z");
    expect(w.prevFrom.toISOString()).toBe("2026-11-09T18:30:00.000Z");
  });

  it("falls back to 30 days for an unknown range", () => {
    expect(parseRange("nonsense")).toBe("30d");
    expect(parseRange("90d")).toBe("90d");
    expect(parseRange(undefined)).toBe("30d");
  });

  it("fills missing days with zero and computes change", () => {
    expect(fillDays(["2026-11-01", "2026-11-02"], [{ date: "2026-11-02", amount: 5, count: 1 }])).toEqual([
      { date: "2026-11-01", amount: 0, count: 0 },
      { date: "2026-11-02", amount: 5, count: 1 },
    ]);
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
  });
});

describe("forecastSales", () => {
  it("returns zeros with low confidence when there is no history", () => {
    const f = forecastSales([], 7, "2026-11-23");
    expect(f.days).toHaveLength(7);
    expect(f.total).toBe(0);
    expect(f.confidence).toBe("low");
    expect(f.days[0].date).toBe("2026-11-23");
  });

  it("projects a flat history forward unchanged", () => {
    const f = forecastSales(series(56, () => 10_000), 7, "2026-11-23");
    expect(f.days.every((d) => d.amount === 10_000)).toBe(true);
    expect(f.total).toBe(70_000);
    expect(f.confidence).toBe("high");
  });

  it("keeps the weekly pattern: busy weekends stay busy", () => {
    const weekend = (date: string) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
    const f = forecastSales(series(56, (_, d) => (weekend(d) ? 30_000 : 10_000)), 7, "2026-11-23");
    for (const d of f.days) expect(d.amount).toBe(weekend(d.date) ? 30_000 : 10_000);
  });

  it("leans upward when recent weeks are growing, within a sensible cap", () => {
    const f = forecastSales(series(56, (i) => 10_000 + i * 400), 7, "2026-11-23");
    const lastWeek = 7 * (10_000 + 52 * 400);
    expect(f.total).toBeGreaterThan(lastWeek * 0.95);
    expect(f.total).toBeLessThan(lastWeek * 1.3);
  });

  it("gives a range that contains the estimate and never goes below zero", () => {
    const f = forecastSales(series(42, (i) => (i % 3 === 0 ? 0 : 20_000)), 7, "2026-11-23");
    for (const d of f.days) {
      expect(d.low).toBeGreaterThanOrEqual(0);
      expect(d.low).toBeLessThanOrEqual(d.amount);
      expect(d.high).toBeGreaterThanOrEqual(d.amount);
    }
    expect(f.confidence).toBe("medium");
  });

  it("uses a plain average when there is under two weeks of history", () => {
    const f = forecastSales(series(5, () => 8_000), 7, "2026-11-23");
    expect(f.days.every((d) => d.amount === 8_000)).toBe(true);
    expect(f.confidence).toBe("low");
    expect(f.basisDays).toBe(5);
  });
});

describe("formatCompactINR", () => {
  it("uses thousands, lakhs and crores", async () => {
    const { formatCompactINR } = await import("@/lib/money");
    expect(formatCompactINR(95_000)).toBe("₹950");
    expect(formatCompactINR(4_520_000)).toBe("₹45.2K");
    expect(formatCompactINR(34_000_000)).toBe("₹3.4L");
    expect(formatCompactINR(1_250_000_000)).toBe("₹1.25Cr");
    expect(formatCompactINR(0)).toBe("₹0");
  });
});
