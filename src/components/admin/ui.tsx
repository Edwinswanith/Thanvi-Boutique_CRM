"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";

const STATUS_STYLE: Record<string, string> = {
  available: "bg-leaf-wash text-leaf",
  received: "bg-leaf-wash text-leaf",
  closed: "bg-leaf-wash text-leaf",
  paid: "bg-leaf-wash text-leaf",
  approved: "bg-gold-wash text-ink",
  reserved: "bg-gold-wash text-ink",
  open: "bg-gold-wash text-ink",
  requested: "bg-gold-wash text-ink",
  in_transit: "bg-ink text-gold-bright",
  sold: "bg-ink/10 text-ink-soft",
  cancelled: "bg-ink/10 text-ink-soft",
  damaged: "bg-madder-wash text-madder",
  returned: "bg-madder-wash text-madder",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status] ?? "bg-ink/10 text-ink"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

interface ScanInputProps {
  onScan: (code: string) => void | Promise<void>;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * Text box that works with USB/Bluetooth barcode scanners: they "type" the code
 * and press Enter. Clears and refocuses after each scan so staff can scan in a row.
 */
export function ScanInput({ onScan, placeholder = "Scan or type a code", label = "Scan", autoFocus, disabled }: ScanInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  async function submit() {
    const code = value.trim().toUpperCase();
    if (!code) return;
    setValue("");
    await onScan(code);
    ref.current?.focus();
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  };
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gold" aria-hidden>▮▯▮</span>
        <input
          ref={ref}
          aria-label={label}
          className="field code pl-12 text-base uppercase"
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
        />
      </div>
      <button type="button" className="btn btn-primary" disabled={disabled || !value.trim()} onClick={() => void submit()}>
        {label}
      </button>
    </div>
  );
}

export interface Tab {
  href: string;
  label: string;
}

export function SubNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav className="rise mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Section">
      {tabs.map((t) => {
        const active = t.href === pathname || (t.href !== tabs[0].href && pathname.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm whitespace-nowrap transition-colors ${active ? "border-gold font-semibold text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "err" | "warn"; children: React.ReactNode }) {
  const style = kind === "ok" ? "border-leaf/30 bg-leaf-wash text-leaf" : kind === "err" ? "border-madder/30 bg-madder-wash text-madder" : "border-gold/40 bg-gold-wash text-ink";
  return (
    <p role={kind === "err" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${style}`}>
      {children}
    </p>
  );
}
