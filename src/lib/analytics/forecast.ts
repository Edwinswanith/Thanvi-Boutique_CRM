import { addDays, weekdayOf } from "./periods";

/**
 * Sales forecast for the next few days.
 *
 * Method (kept simple on purpose, so the owner can trust and explain it):
 *  1. For each weekday, average the last 6 same weekdays, recent weeks weighing more.
 *     Saree retail has a strong weekly rhythm (weekends, market days).
 *  2. Nudge by the recent trend: last 14 days vs the 14 before, half-applied and capped.
 *  3. The range is ±1 standard deviation of that weekday's history.
 * With under two weeks of history it falls back to a plain daily average.
 */

export interface DayPoint {
  date: string;
  amount: number;
}

export interface ForecastPoint extends DayPoint {
  low: number;
  high: number;
}

export type Confidence = "low" | "medium" | "high";

export interface Forecast {
  days: ForecastPoint[];
  total: number;
  low: number;
  high: number;
  confidence: Confidence;
  /** Days of history the estimate is based on. */
  basisDays: number;
  /** Recent trend applied, e.g. 1.05 = +5%. */
  trend: number;
}

const WEEKS = 6;
const MIN_SEASONAL_DAYS = 14;
const TREND_MIN = 0.8;
const TREND_MAX = 1.25;

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : 0);

function stdDev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Most recent value first; weights fall off quickly so last week counts most. */
function weightedMean(recentFirst: readonly number[]): number {
  const weights = recentFirst.map((_, i) => (recentFirst.length - i) ** 2);
  return sum(recentFirst.map((x, i) => x * weights[i])) / sum(weights);
}

function trendFactor(history: readonly DayPoint[]): number {
  if (history.length < 28) return 1;
  const recent = mean(history.slice(-14).map((d) => d.amount));
  const before = mean(history.slice(-28, -14).map((d) => d.amount));
  if (before <= 0) return 1;
  const halfApplied = 1 + (recent / before - 1) / 2;
  return Math.min(TREND_MAX, Math.max(TREND_MIN, halfApplied));
}

function confidenceFor(basisDays: number): Confidence {
  if (basisDays >= 56) return "high";
  if (basisDays >= 28) return "medium";
  return "low";
}

function estimateDay(history: readonly DayPoint[], date: string, trend: number): ForecastPoint {
  const seasonal = history.length >= MIN_SEASONAL_DAYS;
  const pool = seasonal ? history.filter((d) => weekdayOf(d.date) === weekdayOf(date)) : history;
  const samples = (seasonal ? pool.slice(-WEEKS) : pool).map((d) => d.amount).reverse();
  const base = seasonal ? weightedMean(samples) : mean(samples);
  const amount = Math.round(base * trend);
  const spread = Math.round(stdDev(samples) * trend);
  return { date, amount, low: Math.max(0, amount - spread), high: amount + spread };
}

/**
 * @param history contiguous daily totals, oldest first, ending the day before `startDate`
 * @param horizon number of days to forecast
 * @param startDate first forecast day (YYYY-MM-DD)
 */
export function forecastSales(history: readonly DayPoint[], horizon: number, startDate: string): Forecast {
  const dates = Array.from({ length: horizon }, (_, i) => addDays(startDate, i));
  if (history.length === 0) {
    return { days: dates.map((date) => ({ date, amount: 0, low: 0, high: 0 })), total: 0, low: 0, high: 0, confidence: "low", basisDays: 0, trend: 1 };
  }
  const trend = trendFactor(history);
  const days = dates.map((date) => estimateDay(history, date, trend));
  return {
    days,
    total: sum(days.map((d) => d.amount)),
    low: sum(days.map((d) => d.low)),
    high: sum(days.map((d) => d.high)),
    confidence: confidenceFor(history.length),
    basisDays: history.length,
    trend,
  };
}
