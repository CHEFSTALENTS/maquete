"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/wallet", label: "My Wallet" },
  { href: "/referrals", label: "Referrals" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="w-full flex items-center justify-between px-6 py-4">
      <Link href="/wallet" className="font-semibold tracking-wide">
        <span className="opacity-90">SolCard</span>
      </Link>

      <div className="flex items-center gap-6 text-sm">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={active ? "opacity-100" : "opacity-70 hover:opacity-100 transition"}
            >
              {it.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3 opacity-80 text-sm">
        <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10" />
        <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10" />
      </div>
    </div>
  );
}
