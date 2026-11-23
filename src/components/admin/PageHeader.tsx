import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="code text-[11px] uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
        <h1 className="display mt-1 text-4xl font-light">{title}</h1>
        {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
        <div className="zari-rule mt-4 w-28" />
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

export function Forbidden() {
  return (
    <div className="panel rise mx-auto mt-16 max-w-md p-8 text-center">
      <p className="display text-2xl">Not available for your role</p>
      <p className="mt-2 text-sm text-ink-soft">Ask your administrator if you need access to this area.</p>
    </div>
  );
}
