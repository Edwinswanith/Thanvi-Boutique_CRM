/** Date helpers for reports. The business runs on Indian time (UTC+5:30, no daylight saving). */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const TIMEZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

export const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangeKey = keyof typeof RANGES;
export const RANGE_LABELS: Record<RangeKey, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

export function parseRange(value: string | undefined | null): RangeKey {
  return value && value in RANGES ? (value as RangeKey) : "30d";
}

/** Calendar day (YYYY-MM-DD) in Indian time. */
export function istDay(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant an Indian calendar day starts. */
export function startOfIstDay(date: Date): Date {
  return new Date(Date.parse(`${istDay(date)}T00:00:00Z`) - IST_OFFSET_MS);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export interface RangeWindow {
  from: Date;
  to: Date;
  prevFrom: Date;
  days: string[];
}

/** The selected window (ending now, today included) and the equal window before it. */
export function rangeWindow(range: RangeKey, now: Date): RangeWindow {
  const n = RANGES[range];
  const from = new Date(startOfIstDay(now).getTime() - (n - 1) * DAY_MS);
  const first = istDay(from);
  return {
    from,
    to: now,
    prevFrom: new Date(from.getTime() - n * DAY_MS),
    days: Array.from({ length: n }, (_, i) => addDays(first, i)),
  };
}

export interface DayRow {
  date: string;
  amount: number;
  count: number;
}

export function fillDays(days: readonly string[], rows: readonly DayRow[]): DayRow[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return days.map((date) => byDate.get(date) ?? { date, amount: 0, count: 0 });
}

/** Percentage change, or null when there is nothing to compare against. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
