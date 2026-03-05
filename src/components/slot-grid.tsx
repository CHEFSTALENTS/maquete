"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/types";
import { loadCards } from "@/lib/cards-store";

export function SlotGrid() {
  const pathname = usePathname();

  const cards = useMemo<Card[]>(() => loadCards(), []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const active = pathname?.includes(`/card/${c.id}`);

        return (
          <Link
            key={c.id}
            href={`/card/${c.id}`}
            className={cn(
              "rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition",
              active && "border-white/25 bg-white/10"
            )}
          >
            <div className="text-xs opacity-60">Card</div>
            <div className="mt-1 text-sm font-semibold">
              {c.holder} •••• {c.ending}
            </div>

            <div className="mt-3 text-xs opacity-70">Balance</div>
            <div className="text-sm font-semibold">
              {(c.balance ?? 0).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
