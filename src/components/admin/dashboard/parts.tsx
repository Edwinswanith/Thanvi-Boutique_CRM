import type { ReactNode } from "react";
import { formatCompactINR } from "@/lib/money";

/** "▲ 12.4%" against the previous period. Shape and words carry it, not colour alone. */
export function Delta({ change, onDark = false }: { change: number | null; onDark?: boolean }) {
  if (change === null) return <span className={`text-xs ${onDark ? "text-paper/50" : "text-ink-soft"}`}>No earlier period to compare</span>;
  const up = change >= 0;
  const tone = onDark ? (up ? "text-gold-bright" : "text-[#f3a79b]") : up ? "text-leaf" : "text-madder";
  return (
    <span className={`text-xs ${onDark ? "text-paper/60" : "text-ink-soft"}`}>
      <span className={`code font-semibold ${tone}`}>{up ? "▲" : "▼"} {Math.abs(change)}%</span> vs previous period
    </span>
  );
}

export function Kpi({ label, value, children, delay = 1 }: { label: string; value: string; children?: ReactNode; delay?: number }) {
  return (
    <div className={`panel rise rise-${delay} flex flex-col justify-between p-5`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p className="display mt-3 text-3xl font-light">{value}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function Card({ title, hint, children, className = "" }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel rise p-6 ${className}`}>
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="display text-lg">{title}</h2>
        {hint && <p className="text-xs text-ink-soft">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export interface BarRow {
  key: string;
  label: string;
  sub?: string;
  amount: number;
  tag?: string;
}

/** Ranked horizontal bars: one hue, value at the end of each row. */
/** `shareOf` = the total the % column is measured against (defaults to the rows shown). */
export function BarList({ rows, empty, ranked = false, shareOf }: { rows: BarRow[]; empty: string; ranked?: boolean; shareOf?: number }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const total = shareOf ?? rows.reduce((a, r) => a + r.amount, 0);
  if (rows.length === 0 || total === 0) return <p className="py-6 text-center text-sm text-ink-soft">{empty}</p>;
  return (
    <ol className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="min-w-0 truncate">
              {ranked && <span className="code mr-2 text-xs text-gold">{String(i + 1).padStart(2, "0")}</span>}
              <span className="font-medium">{r.label}</span>
              {r.tag && <span className="code ml-2 rounded border border-line-strong px-1 text-[10px] uppercase text-ink-soft">{r.tag}</span>}
              {r.sub && <span className="ml-2 text-xs text-ink-soft">{r.sub}</span>}
            </p>
            <p className="code shrink-0 text-sm">
              {formatCompactINR(r.amount)}
              <span className="ml-2 inline-block w-9 text-right text-[11px] text-ink-soft">{Math.round((r.amount / total) * 100)}%</span>
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="bar-slide h-full rounded-full bg-ink" style={{ width: `${(r.amount / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
