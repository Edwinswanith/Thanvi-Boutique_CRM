"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/http";
import { GST_STATES } from "@/lib/gst/states";
import { formatINR } from "@/lib/money";
import type { CheckoutQuote, CheckoutQuoteInput, CheckoutResult } from "@/lib/storefront/checkout";
import { useCart } from "./CartProvider";
import { CheckoutTotals } from "./CheckoutTotals";

const fields = [
  { name: "name", label: "Full name", autoComplete: "name", maxLength: 100 },
  { name: "email", label: "Email", autoComplete: "email", type: "email", maxLength: 254 },
  { name: "phone", label: "Phone", autoComplete: "tel", type: "tel", maxLength: 20 },
  { name: "address", label: "Street address", autoComplete: "street-address", maxLength: 250 },
  { name: "city", label: "City", autoComplete: "address-level2", maxLength: 100 },
  { name: "postalCode", label: "PIN code", autoComplete: "postal-code", maxLength: 6 },
] as const;

export function CheckoutForm() {
  const { lines, ready, subtotal, remove } = useCart();
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ body: string; quote: CheckoutQuote } | null>(null);
  const pending = useRef<{ body: string; id: string } | null>(null);

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !lines.length) return;
    const fields = new FormData(event.currentTarget);
    const get = (name: string) => String(fields.get(name) ?? "");
    const data: CheckoutQuoteInput = {
      customer: { name: get("name"), email: get("email"), phone: get("phone"), address: get("address"), city: get("city"), state: get("state"), postalCode: get("postalCode") },
      lines: lines.map((line) => ({ slug: line.slug, quantity: line.qty, unitPrice: line.price })),
      paymentMethod: get("paymentMethod") === "cod" ? "cod" : "dummy",
    };
    const body = JSON.stringify(data);
    setBusy(true);
    setError("");
    try {
      if (review?.body !== body) {
        const quote = await api<CheckoutQuote>("/api/shop/checkout-quote", { method: "POST", body: data });
        setReview({ body, quote });
        return;
      }
      if (pending.current?.body !== body) pending.current = { body, id: crypto.randomUUID() };
      const order = await api<CheckoutResult>("/api/shop/orders", { method: "POST", body: { ...data, requestId: pending.current.id, expectedTotal: review.quote.total } });
      setResult(order);
      data.lines.forEach((line) => remove(line.slug));
    } catch (error) {
      setReview(null);
      setError(error instanceof Error ? error.message : "The order could not be placed.");
    } finally {
      setBusy(false);
    }
  }

  if (result) return (
    <div className="panel max-w-xl p-6">
      <h2 className="display text-3xl">Test order confirmed</h2>
      <p className="mt-3 break-all">Order {result.orderNumber}</p>
      <p className="mt-2">{formatINR(result.total)} · {result.paymentStatus === "test_paid" ? "Dummy payment recorded" : "Cash on delivery pending"}</p>
      {result.breakdown && <CheckoutTotals quote={result.breakdown} />}
      {result.invoiceUrl && <Link href={result.invoiceUrl} className="btn btn-ghost mt-6 mr-2">View test invoice</Link>}
      <Link href="/shop/sarees" className="btn btn-gold mt-6">Continue shopping</Link>
    </div>
  );
  if (!ready) return <p role="status">Loading your bag…</p>;
  if (!lines.length) return <p>Your bag is empty. <Link className="underline" href="/shop/sarees">Browse sarees</Link></p>;

  return (
    <form onSubmit={placeOrder} onChange={() => setReview(null)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <fieldset disabled={busy} className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <legend className="display px-2 text-2xl">Delivery details</legend>
        {fields.map((field) => (
          <label key={field.name} className={field.name === "address" ? "sm:col-span-2" : undefined}>
            <span className="label">{field.label}</span>
            <input className="field mt-1 w-full" required name={field.name} autoComplete={field.autoComplete} maxLength={field.maxLength} type={"type" in field ? field.type : "text"} />
          </label>
        ))}
        <label>
          <span className="label">State</span>
          <select className="field mt-1 w-full" name="state" autoComplete="address-level1" defaultValue="" required>
            <option value="" disabled>Select state or union territory</option>
            {[...GST_STATES].sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => <option key={code} value={name}>{name}</option>)}
          </select>
        </label>
      </fieldset>
      <div className="panel self-start p-5 sm:p-6">
        <fieldset disabled={busy} className="space-y-3">
          <legend className="display mb-2 text-2xl">Payment method</legend>
          <label className="flex items-center gap-2"><input type="radio" name="paymentMethod" value="dummy" defaultChecked /> Dummy online payment</label>
          <label className="flex items-center gap-2"><input type="radio" name="paymentMethod" value="cod" /> Cash on delivery</label>
        </fieldset>
        <p className="mt-4 text-sm text-ink-soft">Use sample details. No real payment or delivery will take place.</p>
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm" aria-label="Order items">
          {lines.map((line) => <li key={line.slug} className="flex justify-between gap-3"><span>{line.title} × {line.qty}</span><span>{formatINR(line.price * line.qty)}</span></li>)}
        </ul>
        {review ? <CheckoutTotals quote={review.quote} /> : <p className="mt-4 flex justify-between font-semibold"><span>Items at listed price</span><span>{formatINR(subtotal)}</span></p>}
        {error && <p role="alert" className="mt-3 text-sm text-madder">{error}</p>}
        <button type="submit" className="btn btn-gold mt-4 w-full" disabled={busy}>{busy ? "Working…" : review ? "Place test order" : "Review shipping and GST"}</button>
        <Link href="/shop/bag" className="mt-3 inline-block text-sm underline">Back to bag</Link>
      </div>
    </form>
  );
}
