"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { api } from "@/lib/http";
import { activeHref, type NavSection } from "./nav";

interface SidebarProps {
  sections: NavSection[];
  userName: string;
  roleName: string;
}

export function Sidebar({ sections, userName, roleName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = activeHref(pathname, sections.flatMap((s) => s.items.filter((i) => !i.phase).map((i) => i.href)));

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        className={`btn fixed top-3 z-40 transition-[left] lg:hidden ${open ? "left-[17rem] btn-ghost bg-card" : "left-3 btn-primary"}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="sidebar"
      >
        {open ? "Close" : "Menu"}
      </button>
      {open && <div className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-ink text-paper transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="zari absolute inset-y-0 right-0 w-1.5" aria-hidden />
        <div className="px-6 pt-5 pb-5">
          <BrandLogo tone="dark" priority className="h-auto w-36" />
          <p className="code mt-2 text-[10px] tracking-[0.35em] text-gold-bright">BACK OFFICE</p>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-paper/40">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === current;
                  if (item.phase) {
                    return (
                      <li key={item.href} className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-paper/35">
                        {item.label}
                        <span className="code rounded border border-paper/15 px-1.5 text-[10px]">{item.phase}</span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`relative block rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-paper/10 text-paper" : "text-paper/70 hover:bg-paper/5 hover:text-paper"}`}
                      >
                        {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded bg-gold-bright" aria-hidden />}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-paper/10 px-6 py-4">
          <p className="truncate text-sm">{userName}</p>
          <p className="text-xs text-gold-bright">{roleName}</p>
          <button onClick={signOut} className="mt-3 text-xs text-paper/60 underline-offset-4 hover:text-paper hover:underline">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
