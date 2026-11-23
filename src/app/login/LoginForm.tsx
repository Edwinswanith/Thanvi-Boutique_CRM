"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/http";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Until React hydrates, keep the button disabled so the browser can never submit
  // the form natively (which would bypass our handler).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: { email: form.get("email"), password: form.get("password") } });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} method="post" action="/login" className="mt-6 space-y-5">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {error && (
        <p role="alert" className="rounded-md border border-madder/30 bg-madder-wash px-3 py-2 text-sm text-madder">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !ready} className="btn btn-primary w-full py-3">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
