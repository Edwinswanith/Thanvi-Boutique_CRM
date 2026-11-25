"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { api } from "@/lib/http";
import { activeItem, type NavItem } from "./nav";

interface SidebarProps {
  items: NavItem[];
  userName: string;
  roleName: string;
}

export function Sidebar({ items, userName, roleName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = activeItem(pathname, items);

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
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-ink text-paper transition-transform lg:visible lg:translate-x-0 ${open ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        <div className="zari absolute inset-y-0 right-0 w-1.5" aria-hidden />
        <div className="px-6 pt-5 pb-5">
          <BrandLogo tone="dark" priority className="h-auto w-36" />
        </div>
        <nav aria-label="CRM navigation" className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item === current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`relative block rounded-md px-3 py-2.5 text-sm transition-colors ${item === current ? "bg-paper/10 font-semibold text-paper" : "text-paper/75 hover:bg-paper/5 hover:text-paper"}`}
                >
                  {item === current && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded bg-gold-bright" aria-hidden />}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
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
