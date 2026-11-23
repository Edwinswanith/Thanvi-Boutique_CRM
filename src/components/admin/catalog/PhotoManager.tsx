"use client";

import { useRef, useState, type DragEvent } from "react";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface Upload {
  key: string;
  name: string;
  progress: number;
  error?: string;
}

interface PhotoManagerProps {
  photoIds: string[];
  onChange: (ids: string[]) => void;
  max: number;
  /** Photos taken when the stock was received, offered as a starting point. */
  stockPhotoIds: string[];
  disabled?: boolean;
}

export const photoSrc = (id: string) => `/api/catalog/photos/${id}`;

function uploadOne(file: File, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/catalog/photos");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const json = (() => { try { return JSON.parse(xhr.responseText) as { success?: boolean; data?: { id: string }; error?: string }; } catch { return null; } })();
      if (xhr.status < 300 && json?.success && json.data) resolve(json.data.id);
      else reject(new Error(json?.error ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

function precheck(file: File): string | null {
  if (!TYPES.includes(file.type)) return "Use JPEG, PNG or WebP";
  if (file.size > MAX_BYTES) return "Larger than 5 MB";
  return null;
}

const move = (ids: string[], from: number, to: number) => {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function PhotoManager({ photoIds, onChange, max, stockPhotoIds, disabled }: PhotoManagerProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dropping, setDropping] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const idsRef = useRef(photoIds);
  idsRef.current = photoIds;
  const room = max - photoIds.length;
  const unusedStock = stockPhotoIds.filter((id) => !photoIds.includes(id));

  const patch = (key: string, p: Partial<Upload>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function addFiles(files: File[]) {
    const batch = files.slice(0, Math.max(0, room)).map((f) => ({ file: f, key: `${f.name}-${f.size}-${Math.random()}` }));
    setUploads((u) => [...u, ...batch.map(({ file, key }) => ({ key, name: file.name, progress: 0, error: precheck(file) ?? undefined }))]);
    for (const { file, key } of batch) {
      if (precheck(file)) continue;
      try {
        const id = await uploadOne(file, (progress) => patch(key, { progress }));
        onChange([...idsRef.current, id]);
        setUploads((u) => u.filter((x) => x.key !== key));
      } catch (e) {
        patch(key, { error: e instanceof Error ? e.message : "Upload failed" });
      }
    }
  }

  function onDropFiles(e: DragEvent) {
    e.preventDefault();
    setDropping(false);
    if (disabled || dragIndex !== null) return;
    void addFiles(Array.from(e.dataTransfer.files));
  }

  function onTileDrop(e: DragEvent, to: number) {
    e.preventDefault();
    e.stopPropagation();
    if (dragIndex !== null && dragIndex !== to) onChange(move(photoIds, dragIndex, to));
    setDragIndex(null);
  }

  return (
    <div onDragOver={(e) => { e.preventDefault(); if (dragIndex === null) setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={onDropFiles}>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label="Website photos, in display order">
        {photoIds.map((id, i) => (
          <li key={id} draggable={!disabled} onDragStart={() => setDragIndex(i)} onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => onTileDrop(e, i)}
            className={`group pop-in relative aspect-[3/4] cursor-grab overflow-hidden rounded-md border bg-gold-wash transition-all active:cursor-grabbing ${dragIndex === i ? "scale-95 opacity-40" : ""} ${i === 0 ? "border-gold-bright ring-2 ring-gold-bright/40" : "border-line"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo */}
            <img src={photoSrc(id)} alt={`Photo ${i + 1}`} className="pointer-events-none h-full w-full object-cover object-top" />
            {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-bright">COVER</span>}
            <span className="code absolute top-1.5 right-1.5 rounded bg-white/85 px-1.5 text-[10px]">{i + 1}</span>
            {!disabled && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-ink/85 to-transparent p-1.5 pt-6 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <div className="flex gap-1">
                  <TileButton label="Move earlier" disabled={i === 0} onClick={() => onChange(move(photoIds, i, i - 1))}>←</TileButton>
                  <TileButton label="Move later" disabled={i === photoIds.length - 1} onClick={() => onChange(move(photoIds, i, i + 1))}>→</TileButton>
                  {i > 0 && <TileButton label="Make cover photo" onClick={() => onChange(move(photoIds, i, 0))}>★</TileButton>}
                </div>
                <TileButton label="Remove photo" onClick={() => onChange(photoIds.filter((p) => p !== id))}>×</TileButton>
              </div>
            )}
          </li>
        ))}
        {uploads.map((u) => (
          <li key={u.key} className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-md border border-dashed border-line-strong bg-card p-2 text-center">
            <div className="w-full">
              <p className="truncate text-[11px] text-ink-soft">{u.name}</p>
              {u.error ? (
                <>
                  <p className="mt-1 text-xs font-semibold text-madder">{u.error}</p>
                  <button type="button" className="mt-2 text-[11px] underline" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>Dismiss</button>
                </>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${u.name}`}>
                  <div className="h-full rounded-full bg-gold-bright transition-[width] duration-200" style={{ width: `${Math.max(6, u.progress)}%` }} />
                </div>
              )}
            </div>
          </li>
        ))}
        {room > 0 && !disabled && (
          <li>
            <label className={`flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-center transition-all ${dropping ? "scale-[1.02] border-gold-bright bg-gold-wash" : "border-line-strong hover:border-gold-bright hover:bg-gold-wash/60"}`}>
              <span className="text-3xl leading-none text-gold">+</span>
              <span className="px-2 text-[11px] font-semibold">{dropping ? "Drop to upload" : "Add photos"}</span>
              <span className="px-2 text-[10px] text-ink-soft">or drag them here</span>
              <input type="file" accept={TYPES.join(",")} multiple className="sr-only" onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </label>
          </li>
        )}
      </ul>
      <p className="mt-3 text-xs text-ink-soft">
        {photoIds.length} of {max} photos · the first photo is the cover · drag to reorder · JPEG, PNG or WebP up to 5 MB · portrait (3:4) looks best
      </p>
      {unusedStock.length > 0 && !disabled && room > 0 && (
        <div className="mt-4 rounded-md border border-line bg-ivory/60 p-3">
          <p className="text-xs font-semibold">Photos taken at receiving</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unusedStock.slice(0, room).map((id) => (
              <button key={id} type="button" onClick={() => onChange([...photoIds, id])} className="group relative h-20 w-15 overflow-hidden rounded border border-line hover:border-gold-bright" aria-label="Use this stock photo">
                {/* eslint-disable-next-line @next/next/no-img-element -- authenticated GridFS photo */}
                <img src={photoSrc(id)} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-ink/60 text-lg text-paper opacity-0 transition-opacity group-hover:opacity-100">+</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TileButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded bg-white/90 text-sm font-bold text-ink transition-transform hover:scale-110 hover:bg-gold-bright disabled:opacity-30 disabled:hover:scale-100">
      {children}
    </button>
  );
}
