"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, LogOut } from "lucide-react";

const items = [
  { href: "/wallet", label: "My Wallet" },
  { href: "/referrals", label: "Referrals" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="w-full">
      <div className="w-full flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link href="/wallet" className="font-semibold tracking-wide">
          <span className="opacity-95 underline underline-offset-4">SolCard</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {items.map((it) => {
            const active = pathname?.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  active
                    ? "opacity-100"
                    : "opacity-70 hover:opacity-100 transition-opacity"
                }
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Gifts"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/0 hover:bg-white/5 transition"
          >
            <Gift className="h-5 w-5 opacity-80" />
          </button>

          <button
            type="button"
            aria-label="Log out"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/0 hover:bg-white/5 transition"
          >
            <LogOut className="h-5 w-5 opacity-80" />
          </button>
        </div>
      </div>
    </header>
  );
}
