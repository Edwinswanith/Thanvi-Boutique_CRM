"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/http";

export function CancelInvoice({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function cancel() {
    const reason = window.prompt("Reason for cancelling (items go back to stock)");
    if (reason === null) return;
    try {
      await api(`/api/invoices/${id}/cancel`, { method: "POST", body: { reason } });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    }
  }
  return (
    <p>
      <button className="btn btn-danger" onClick={cancel}>Cancel unpaid invoice</button>
      {error && <span role="alert" className="ml-3 text-sm text-madder">{error}</span>}
    </p>
  );
}
