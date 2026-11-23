"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/admin/Modal";
import { Notice } from "@/components/admin/ui";
import { api } from "@/lib/http";
import { formatINR } from "@/lib/money";
import { BILL_STATUS_LABELS, PAYMENT_MODE_LABELS, VENDOR_PAYMENT_MODES } from "@/lib/payables";
import type { BillDetail, BillView } from "@/server/services/payables";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-leaf-wash text-leaf", partial: "bg-gold-wash text-ink", unpaid: "bg-ink/10 text-ink", draft: "border border-dashed border-line-strong text-ink-soft", overdue: "bg-madder-wash text-madder",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const inputDate = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function BillStatus({ bill }: { bill: BillView }) {
  const key = bill.overdue ? "overdue" : bill.status;
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLE[key]}`}>{bill.overdue ? "! " : ""}{BILL_STATUS_LABELS[key]}</span>;
}

interface DialogProps { bill: BillView; canPay: boolean; canEdit: boolean; onClose: () => void; onChanged: () => void }

function BillDialog({ bill, canPay, canEdit, onClose, onChanged }: DialogProps) {
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current: BillView = detail ?? bill;

  useEffect(() => {
    api<BillDetail>(`/api/payables/bills/${bill.id}`).then(setDetail).catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load the bill"));
  }, [bill.id]);

  async function send(url: string, method: string, body: unknown, message: string) {
    setBusy(true); setError(null); setDone(null);
    try {
      setDetail(await api<BillDetail>(url, { method, body }));
      setDone(message);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    void send(`/api/payables/bills/${bill.id}/payments`, "POST", { amount: Number(f.amount), mode: f.mode, reference: f.reference, note: f.note, paidAt: f.paidAt || undefined }, "Payment recorded.").then(() => form.reset());
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const amount = f.amount && Number(f.amount) * 100 !== current.amount ? { amount: Number(f.amount) } : {};
    void send(`/api/payables/bills/${bill.id}`, "PATCH", { ...amount, vendorInvoiceNo: f.vendorInvoiceNo, dueDate: f.dueDate }, "Bill updated.");
  }

  return (
    <Modal title={`Bill ${current.number}`} onClose={onClose} wide>
      <p className="text-sm text-ink-soft">{current.vendorName} · {current.quantity} × {current.description || current.sku} · delivery <span className="code">{current.receiptRef}</span></p>
      <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line text-sm">
        {[["Bill amount", current.amount], ["Paid so far", current.paid], ["Still to pay", current.pending]].map(([label, value]) => (
          <div key={String(label)} className="bg-paper px-4 py-3"><dt className="text-[10px] font-semibold uppercase tracking-widest text-ink-soft">{label}</dt><dd className="code mt-1 text-base">{formatINR(Number(value))}</dd></div>
        ))}
      </dl>
      <div className="mt-4 space-y-2">{error && <Notice kind="err">{error}</Notice>}{done && <Notice kind="ok">{done}</Notice>}</div>

      {canPay && current.pending > 0 && (
        <form onSubmit={pay} method="post" className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <h3 className="display text-lg sm:col-span-2">Record a payment</h3>
          <div><label className="label" htmlFor="p-amount">Amount paid (₹)</label><input id="p-amount" name="amount" type="number" step="0.01" min="0.01" max={current.pending / 100} defaultValue={current.pending / 100} key={current.pending} required className="field code" /></div>
          <div><label className="label" htmlFor="p-mode">Paid by</label><select id="p-mode" name="mode" className="field">{VENDOR_PAYMENT_MODES.map((m) => <option key={m} value={m}>{PAYMENT_MODE_LABELS[m]}</option>)}</select></div>
          <div><label className="label" htmlFor="p-ref">Reference (UTR / cheque no.)</label><input id="p-ref" name="reference" maxLength={80} className="field code" /></div>
          <div><label className="label" htmlFor="p-date">Payment date</label><input id="p-date" name="paidAt" type="date" max={inputDate(new Date().toISOString())} defaultValue={inputDate(new Date().toISOString())} className="field" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="p-note">Note (optional)</label><input id="p-note" name="note" maxLength={300} className="field" /></div>
          <div className="flex justify-end sm:col-span-2"><button className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Record payment"}</button></div>
        </form>
      )}

      {canEdit && (
        <form onSubmit={save} method="post" className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3" key={`${current.amount}-${current.paid}`}>
          <h3 className="display text-lg sm:col-span-3">Bill details</h3>
          <div><label className="label" htmlFor="b-amount">Bill amount (₹)</label><input id="b-amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={current.amount ? current.amount / 100 : ""} disabled={current.paid > 0} required={current.status === "draft"} className="field code" /></div>
          <div><label className="label" htmlFor="b-inv">Vendor&apos;s invoice no.</label><input id="b-inv" name="vendorInvoiceNo" maxLength={40} defaultValue={current.vendorInvoiceNo} className="field code uppercase" /></div>
          <div><label className="label" htmlFor="b-due">Pay by</label><input id="b-due" name="dueDate" type="date" defaultValue={inputDate(current.dueDate)} required className="field" /></div>
          <p className="text-xs text-ink-soft sm:col-span-2">{current.paid > 0 ? "The amount is locked because a payment has been recorded." : "The amount can be corrected until the first payment."}</p>
          <div className="flex justify-end"><button className="btn btn-ghost" disabled={busy}>Save details</button></div>
        </form>
      )}

      <div className="mt-5 border-t border-line pt-5">
        <h3 className="display text-lg">Payments made</h3>
        {!detail && !error && <div className="shimmer mt-3 h-10 rounded" />}
        {detail && !detail.payments.length && <p className="mt-2 text-sm text-ink-soft">No payments yet.</p>}
        <ul className="mt-2 divide-y divide-line text-sm">
          {detail?.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <span><span className="code font-semibold">{formatINR(p.amount)}</span> · {PAYMENT_MODE_LABELS[p.mode]}{p.reference && <span className="code text-ink-soft"> · {p.reference}</span>}{p.note && <span className="text-ink-soft"> · {p.note}</span>}</span>
              <span className="text-xs text-ink-soft">{day(p.paidAt)} · by {p.recordedBy}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

export function BillsTable({ bills, canPay, canEdit }: { bills: BillView[]; canPay: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<BillView | null>(null);
  return (
    <>
      <div className="panel rise rise-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <th className="px-5 py-3 font-semibold">Bill</th><th className="px-3 py-3 font-semibold">Vendor</th><th className="px-3 py-3 font-semibold">Delivery</th>
              <th className="px-3 py-3 font-semibold">Pay by</th><th className="px-3 py-3 text-right font-semibold">Amount</th><th className="px-3 py-3 text-right font-semibold">Pending</th>
              <th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-3"><span className="code text-gold">{b.number}</span>{b.vendorInvoiceNo && <span className="code block text-[11px] text-ink-soft">{b.vendorInvoiceNo}</span>}</td>
                <td className="px-3 py-3 font-semibold">{b.vendorName}</td>
                <td className="px-3 py-3 text-ink-soft">{b.quantity} × {b.description || b.sku}<span className="block text-[11px]">{day(b.billDate)}</span></td>
                <td className={`px-3 py-3 ${b.overdue ? "font-semibold text-madder" : ""}`}>{b.status === "paid" ? "—" : day(b.dueDate)}</td>
                <td className="code px-3 py-3 text-right">{b.amount ? formatINR(b.amount) : "—"}</td>
                <td className="code px-3 py-3 text-right font-semibold">{b.pending ? formatINR(b.pending) : "—"}</td>
                <td className="px-3 py-3"><BillStatus bill={b} /></td>
                <td className="px-5 py-3 text-right">
                  <button className={`btn px-3 py-1.5 text-xs ${canPay && b.pending > 0 ? "btn-primary" : "btn-ghost"}`} onClick={() => setOpen(b)}>
                    {b.status === "draft" && canEdit ? "Enter amount" : canPay && b.pending > 0 ? "Pay" : "View"}
                  </button>
                </td>
              </tr>
            ))}
            {!bills.length && <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-soft">No bills here.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <BillDialog bill={open} canPay={canPay} canEdit={canEdit} onClose={() => setOpen(null)} onChanged={() => router.refresh()} />}
    </>
  );
}
