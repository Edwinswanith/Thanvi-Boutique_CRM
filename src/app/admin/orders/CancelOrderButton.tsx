"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/http";

export function CancelOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!window.confirm("Cancel this test order and return its pieces to WEB stock?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not cancel the order.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Cancel order"}</button>
      {error && <p role="alert" className="mt-2 text-madder">{error}</p>}
    </>
  );
}
