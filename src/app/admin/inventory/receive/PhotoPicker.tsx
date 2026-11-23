"use client";

import { useState } from "react";

interface Props {
  photoIds: string[];
  onChange: (ids: string[]) => void;
}

const MAX = 6;

/** Opens the phone/tablet camera (capture) or file picker and uploads each photo. */
export function PhotoPicker({ photoIds, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const ids = [...photoIds];
    for (const file of Array.from(files).slice(0, MAX - ids.length)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { success?: boolean; data?: { id: string }; error?: string } | null;
      if (!res?.ok || !json?.success || !json.data) {
        setError(json?.error ?? "Photo upload failed");
        break;
      }
      ids.push(json.data.id);
    }
    onChange(ids);
    setBusy(false);
  }

  return (
    <div>
      <p className="label">Photos</p>
      <div className="flex flex-wrap gap-3">
        {photoIds.map((id) => (
          <div key={id} className="relative h-24 w-20 overflow-hidden rounded border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo */}
            <img src={`/api/uploads/${id}`} alt="Product" className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => onChange(photoIds.filter((p) => p !== id))}
              className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-ink text-xs text-paper">×</button>
          </div>
        ))}
        {photoIds.length < MAX && (
          <label className={`flex h-24 w-20 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-gold text-center text-[11px] text-gold hover:bg-gold-wash ${busy ? "opacity-50" : ""}`}>
            <span className="text-2xl leading-none">+</span>
            {busy ? "Uploading…" : "Take / add photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" disabled={busy}
              onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-madder">{error}</p>}
    </div>
  );
}
