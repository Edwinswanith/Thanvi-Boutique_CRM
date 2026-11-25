"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Notice, ScanInput } from "@/components/admin/ui";
import type { InvoiceCalc } from "@/lib/gst/engine";
import { api } from "@/lib/http";
import { formatINR } from "@/lib/money";
import type { ItemView } from "@/server/services/items";
import type { LocationOption } from "@/server/services/myLocations";
import { CustomerFields, EMPTY_CUSTOMER, type Customer } from "./CustomerFields";

type Disc = { type: "percent" | "flat"; value: number } | null;
interface CartLine { code: string; name: string; mrp: number; discount: Disc }
type Mode = "cash" | "upi" | "card" | "razorpay";

interface Props {
  stores: LocationOption[];
  initialStoreId: string;
  pricesIncludeTax: boolean;
}

export function Pos({ stores, initialStoreId, pricesIncludeTax }: Props) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(initialStoreId);
  const [channel, setChannel] = useState<"store" | "instagram" | "online">("store");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [billDisc, setBillDisc] = useState<Disc>(null);
  const [customer, setCustomer] = useState<Customer>(EMPTY_CUSTOMER);
  const [calc, setCalc] = useState<(InvoiceCalc & { supplyType: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const body = useCallback(
    (mode: Mode, reference = "") => ({
      locationId: storeId,
      channel,
      lines: cart.map((l) => ({ code: l.code, discount: l.discount })),
      billDiscount: billDisc,
      customer,
      payment: { mode, reference },
    }),
    [storeId, channel, cart, billDisc, customer],
  );

  useEffect(() => {
    if (!cart.length) return setCalc(null);
    const t = setTimeout(() => {
      api<InvoiceCalc & { supplyType: string }>("/api/invoices/preview", { method: "POST", body: body("cash") })
        .then((c) => { setCalc(c); setError(null); })
        .catch((e) => setError(e instanceof Error ? e.message : "Preview failed"));
    }, 200);
    return () => clearTimeout(t);
  }, [cart, billDisc, customer, body]);

  async function scan(code: string) {
    setError(null);
    if (cart.some((l) => l.code === code)) return setError(`${code} is already on the bill`);
    try {
      const { item } = await api<{ item: ItemView }>(`/api/items/${encodeURIComponent(code)}`);
      if (item.location.id !== storeId) return setError(`${code} is at ${item.location.name}, not this store`);
      if (item.status !== "available") return setError(`${code} is ${item.status.replace("_", " ")}`);
      setCart((c) => [...c, { code: item.code, name: item.name, mrp: item.mrp, discount: null }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    }
  }

  async function charge(mode: Mode) {
    const reference = mode === "upi" || mode === "card" ? (window.prompt(`${mode.toUpperCase()} reference / last 4 digits (optional)`) ?? "") : "";
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ id: string; warning: string | null }>("/api/invoices", { method: "POST", body: body(mode, reference) });
      router.push(`/admin/billing/invoices/${res.id}${res.warning ? `?warning=${encodeURIComponent(res.warning)}` : ""}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing failed");
      setBusy(false);
    }
  }

  const lineCalc = (code: string) => calc?.lines.find((l) => l.key === code);
  const setLineDisc = (code: string, d: Disc) => setCart((c) => c.map((l) => (l.code === code ? { ...l, discount: d } : l)));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="rise flex flex-wrap gap-3">
          <select aria-label="Store" className="field w-auto" value={storeId} onChange={(e) => { setStoreId(e.target.value); setCart([]); }}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
          </select>
          <select aria-label="Channel" className="field w-auto" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
            <option value="store">Walk-in</option><option value="instagram">Instagram order</option><option value="online">Website order</option>
          </select>
        </div>
        <div className="panel rise rise-1 p-4"><ScanInput onScan={scan} label="Add" autoFocus placeholder="Scan saree tag" /></div>
        {error && <Notice kind="err">{error}</Notice>}
        <div className="panel rise rise-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="px-4 py-3">Item</th><th className="px-2 py-3 text-right">MRP</th><th className="px-2 py-3">Discount</th>
                <th className="px-2 py-3 text-right">GST</th><th className="px-4 py-3 text-right">Amount</th><th />
              </tr>
            </thead>
            <tbody>
              {cart.map((l) => {
                const c = lineCalc(l.code);
                return (
                  <tr key={l.code} className="border-b border-line/70">
                    <td className="px-4 py-2.5"><p className="font-semibold">{l.name}</p><p className="code text-xs text-gold">{l.code}</p></td>
                    <td className="code px-2 text-right">{formatINR(l.mrp)}</td>
                    <td className="px-2"><DiscountInput value={l.discount} onChange={(d) => setLineDisc(l.code, d)} /></td>
                    <td className="code px-2 text-right text-xs">{c ? `${c.rate}%` : "…"}</td>
                    <td className="code px-4 text-right font-semibold">{c ? formatINR(c.total) : "…"}</td>
                    <td className="pr-3"><button aria-label={`Remove ${l.code}`} className="text-ink-soft hover:text-madder" onClick={() => setCart((x) => x.filter((y) => y.code !== l.code))}>×</button></td>
                  </tr>
                );
              })}
              {!cart.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-ink-soft">Scan a tag to start the bill.</td></tr>}
            </tbody>
          </table>
        </div>
        <CustomerFields value={customer} onChange={setCustomer} />
      </div>

      <aside className="panel rise rise-3 h-fit overflow-hidden xl:sticky xl:top-8">
        <div className="bg-ink px-5 py-4 text-paper">
          <p className="text-[10px] uppercase tracking-[0.2em] text-paper/60">To pay</p>
          <p className="display text-4xl">{formatINR(calc?.totals.grandTotal ?? 0)}</p>
          <p className="text-xs text-paper/60">{cart.length} item(s) · {pricesIncludeTax ? "MRP includes GST" : "GST added to price"}{calc ? ` · ${calc.supplyType === "inter" ? "IGST" : "CGST + SGST"}` : ""}</p>
        </div>
        <div className="space-y-2 p-5 text-sm">
          <Row label="MRP total" value={calc?.totals.mrp} />
          <Row label="Discount" value={calc ? -calc.totals.discount : undefined} />
          <Row label="Taxable value" value={calc?.totals.taxable} />
          {calc?.supplyType === "inter" ? <Row label="IGST" value={calc.totals.igst} /> : <><Row label="CGST" value={calc?.totals.cgst} /><Row label="SGST" value={calc?.totals.sgst} /></>}
          <Row label="Round off" value={calc?.totals.roundOff} />
          <div className="border-t border-line pt-3">
            <p className="label">Bill discount</p>
            <DiscountInput value={billDisc} onChange={setBillDisc} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3">
            {(["cash", "upi", "card"] as const).map((m) => (
              <button key={m} className="btn btn-primary py-3 uppercase" disabled={busy || !calc} onClick={() => charge(m)}>{m}</button>
            ))}
          </div>
          <button className="btn btn-gold w-full py-3" disabled={busy || !calc} onClick={() => charge("razorpay")}>Send Razorpay payment link</button>
          <p className="text-xs text-ink-soft">Razorpay bills stay open with the pieces on hold until payment is confirmed.</p>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | undefined }) {
  return <div className="flex justify-between"><span className="text-ink-soft">{label}</span><span className="code">{value === undefined ? "—" : formatINR(value)}</span></div>;
}

function DiscountInput({ value, onChange }: { value: Disc; onChange: (d: Disc) => void }) {
  const type = value?.type ?? "percent";
  return (
    <div className="flex w-36">
      <input aria-label="Discount value" className="field code rounded-r-none px-2 py-1" type="number" min={0} value={value?.value ?? ""} placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? null : { type, value: Number(e.target.value) })} />
      <button type="button" aria-label="Toggle discount type" className="rounded-r-md border border-l-0 border-line-strong px-2 text-xs font-semibold"
        onClick={() => onChange(value ? { ...value, type: type === "percent" ? "flat" : "percent" } : { type: type === "percent" ? "flat" : "percent", value: 0 })}>
        {type === "percent" ? "%" : "₹"}
      </button>
    </div>
  );
}
