"use client";

import { useId, useState, type KeyboardEvent } from "react";

interface CounterProps {
  length: number;
  max: number;
  ideal?: number;
}

/** "42 / 60" that turns gold past the ideal length and red at the hard limit. */
export function Counter({ length, max, ideal }: CounterProps) {
  const tone = length >= max ? "text-madder" : ideal && length > ideal ? "text-gold" : "text-ink-soft";
  return <span className={`code text-[11px] tabular-nums transition-colors ${tone}`}>{length} / {ideal ?? max}</span>;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  ideal?: number;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  multiline?: number;
  prefix?: string;
}

export function TextField({ label, value, onChange, max, ideal, hint, placeholder, disabled, multiline, prefix }: TextFieldProps) {
  const id = useId();
  const common = {
    id, value, placeholder, disabled, maxLength: max,
    "aria-describedby": hint ? `${id}-hint` : undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="label">{label}</label>
        <Counter length={value.length} max={max} ideal={ideal} />
      </div>
      {multiline ? (
        <textarea {...common} rows={multiline} className="field resize-y leading-relaxed" />
      ) : prefix ? (
        <div className="flex items-stretch overflow-hidden rounded-md border border-line-strong bg-card focus-within:border-ink-2 focus-within:shadow-[0_0_0_3px_rgba(213,179,89,.35)]">
          <span className="code flex items-center bg-ivory px-2.5 text-xs text-ink-soft select-none">{prefix}</span>
          <input {...common} className="code min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
        </div>
      ) : (
        <input {...common} className="field" />
      )}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

interface HighlightsProps {
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
  maxLength: number;
  disabled?: boolean;
}

/** Bullet points shown on the product page. Enter adds, × removes. */
export function HighlightsField({ value, onChange, max, maxLength, disabled }: HighlightsProps) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const add = () => {
    const text = draft.trim();
    if (!text || value.length >= max || value.includes(text)) return;
    onChange([...value, text]);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label">Highlights</label>
        <span className="code text-[11px] text-ink-soft">{value.length} / {max}</span>
      </div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((h) => (
            <li key={h} className="pop-in flex items-center gap-1.5 rounded-full border border-gold-bright/60 bg-gold-wash py-1 pr-1 pl-3 text-sm">
              {h}
              <button type="button" disabled={disabled} onClick={() => onChange(value.filter((x) => x !== h))}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-soft hover:bg-ink hover:text-paper" aria-label={`Remove ${h}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="flex gap-2">
          <input id={id} value={draft} maxLength={maxLength} disabled={disabled} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey}
            className="field" placeholder="e.g. Pure handloom · Zari border · Blouse piece included" />
          <button type="button" className="btn btn-ghost shrink-0" disabled={disabled || !draft.trim()} onClick={add}>Add</button>
        </div>
      )}
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}
