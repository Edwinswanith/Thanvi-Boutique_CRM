"use client";

import { useState } from "react";
import { formatCompactINR, formatINR } from "@/lib/money";

export interface ChartBar {
  date: string;
  amount: number;
  /** Bills that day (actual days only). */
  count?: number;
  /** Likely range (forecast days only). */
  low?: number;
  high?: number;
  forecast: boolean;
}

const GRID_LINES = 4;

function niceMax(value: number): number {
  if (value <= 0) return 100_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

function dayLabel(date: string, long = false): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC", day: "numeric", month: "short", ...(long ? { weekday: "long" } : {}),
  });
}

/** Daily sales as bars, with the forecast days continuing in gold. One shared rupee axis. */
export function SalesChart({ bars }: { bars: ChartBar[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...bars.map((b) => b.high ?? b.amount)));
  const dense = bars.length > 50;
  const labelEvery = Math.ceil(bars.length / 7);
  const firstForecast = bars.findIndex((b) => b.forecast);
  const hovered = active === null ? null : bars[active];

  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" aria-hidden />Sales (each day)</span>
        <span className="flex items-center gap-1.5"><span className="forecast-fill h-2.5 w-2.5 rounded-sm" aria-hidden />Forecast (next 7 days)</span>
        <span className="code ml-auto min-h-4 text-ink" aria-live="polite">
          {hovered && (
            <>
              {dayLabel(hovered.date, true)} · <strong>{formatINR(hovered.amount)}</strong>
              {hovered.forecast ? ` expected (${formatCompactINR(hovered.low ?? 0)}–${formatCompactINR(hovered.high ?? 0)})` : ` · ${hovered.count ?? 0} bill${hovered.count === 1 ? "" : "s"}`}
            </>
          )}
        </span>
      </figcaption>

      <div className="flex gap-3">
        <div className="code flex h-56 flex-col justify-between text-right text-[10px] text-ink-soft" aria-hidden>
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => <span key={i} className="-translate-y-1.5">{formatCompactINR((max * (GRID_LINES - i)) / GRID_LINES)}</span>)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-56" onMouseLeave={() => setActive(null)}>
            {Array.from({ length: GRID_LINES + 1 }, (_, i) => (
              <span key={i} className={`absolute inset-x-0 border-t ${i === GRID_LINES ? "border-line-strong" : "border-dashed border-line"}`} style={{ top: `${(i / GRID_LINES) * 100}%` }} aria-hidden />
            ))}
            <div className={`absolute inset-0 flex items-end ${dense ? "gap-px" : "gap-0.5"}`}>
              {bars.map((b, i) => (
                <button
                  key={b.date}
                  type="button"
                  className={`group relative h-full min-w-0 flex-1 cursor-default ${i === firstForecast ? "ml-2" : ""}`}
                  aria-label={`${dayLabel(b.date, true)}: ${formatINR(b.amount)}${b.forecast ? " forecast" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  {active === i && <span className="absolute inset-0 rounded-sm bg-gold-wash/70" aria-hidden />}
                  <span
                    className={`bar-grow absolute inset-x-0 bottom-0 rounded-t-[3px] transition-opacity ${b.forecast ? "forecast-fill" : "bg-ink"} ${active !== null && active !== i ? "opacity-45" : ""}`}
                    style={{ height: `${Math.max(b.amount > 0 ? 1 : 0, (b.amount / max) * 100)}%`, animationDelay: `${Math.min(i * 8, 500)}ms` }}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>
          <div className={`code mt-2 flex text-[10px] text-ink-soft ${dense ? "gap-px" : "gap-0.5"}`} aria-hidden>
            {bars.map((b, i) => (
              <span key={b.date} className={`relative h-3 min-w-0 flex-1 ${i === firstForecast ? "ml-2" : ""}`}>
                {(i % labelEvery === 0 && (firstForecast < 0 || i < firstForecast - 2)) || i === firstForecast ? (
                  <span className={`absolute left-0 whitespace-nowrap ${i === firstForecast ? "font-semibold text-gold" : ""}`}>{i === firstForecast ? "Forecast →" : dayLabel(b.date)}</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
