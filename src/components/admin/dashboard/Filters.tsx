"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RANGE_LABELS, type RangeKey } from "@/lib/analytics/periods";

interface FiltersProps {
  range: RangeKey;
  locationId: string | null;
  locations: { id: string; name: string }[];
}

function href(range: RangeKey, locationId: string | null): string {
  const qs = new URLSearchParams({ range, ...(locationId ? { store: locationId } : {}) });
  return `/admin/reports?${qs.toString()}`;
}

/** One row of filters above every chart: period, then store. State lives in the URL so it can be shared. */
export function Filters({ range, locationId, locations }: FiltersProps) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-md border border-line-strong bg-card p-0.5" role="group" aria-label="Period">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
          <Link key={r} href={href(r, locationId)} aria-current={r === range ? "true" : undefined}
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${r === range ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
            {RANGE_LABELS[r]}
          </Link>
        ))}
      </div>
      {locations.length > 1 && (
        <select aria-label="Store" className="field w-auto py-1.5 text-sm" value={locationId ?? ""} onChange={(e) => router.push(href(range, e.target.value || null))}>
          <option value="">All stores and online</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
    </div>
  );
}
