"use client";

import { ACTIONS, DATA_MODULES, SYSTEM_MODULES, type Action } from "@/lib/rbac/permissions";

interface Props {
  isSystem: boolean;
  value: ReadonlySet<string>;
  disabled: boolean;
  onChange: (next: Set<string>) => void;
}

export function PermissionMatrix({ isSystem, value, disabled, onChange }: Props) {
  const modules = Object.entries(isSystem ? SYSTEM_MODULES : DATA_MODULES);

  const toggle = (perm: string) => {
    const next = new Set(value);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    onChange(next);
  };
  const toggleRow = (module: string) => {
    const perms = ACTIONS.map((a) => `${module}.${a}`);
    const allOn = perms.every((p) => value.has(p));
    const next = new Set(value);
    perms.forEach((p) => (allOn ? next.delete(p) : next.add(p)));
    onChange(next);
  };
  const toggleCol = (action: Action) => {
    const perms = modules.map(([m]) => `${m}.${action}`);
    const allOn = perms.every((p) => value.has(p));
    const next = new Set(value);
    perms.forEach((p) => (allOn ? next.delete(p) : next.add(p)));
    onChange(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line-strong">
            <th className="py-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Module</th>
            {ACTIONS.map((a) => (
              <th key={a} className="px-1 py-2 text-center">
                <button type="button" disabled={disabled} onClick={() => toggleCol(a)}
                  className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-ink disabled:hover:text-ink-soft">
                  {a}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map(([module, label]) => (
            <tr key={module} className="border-b border-line/70 hover:bg-gold-wash/30">
              <td className="py-2 pr-4">
                <button type="button" disabled={disabled} onClick={() => toggleRow(module)} className="text-left hover:text-ink-2">
                  {label}
                </button>
              </td>
              {ACTIONS.map((a) => {
                const perm = `${module}.${a}`;
                const on = value.has(perm);
                return (
                  <td key={a} className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${label}: ${a}`}
                      disabled={disabled}
                      onClick={() => toggle(perm)}
                      className={`mx-auto block h-6 w-6 rounded border transition-colors ${on ? "border-ink bg-ink text-gold-bright" : "border-line-strong bg-card hover:border-ink"} disabled:cursor-not-allowed`}
                    >
                      {on ? "✓" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
