"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Shell } from "@/components/ui/card-shell";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/mock-data";
import { loadCards } from "@/lib/cards-store";

export function SlotGrid() {
  const pathname = usePathname();
  const [cards, setCards] = useState<Card[]>(() => loadCards());

  // refresh when coming back to /wallet (after creating a card)
  useEffect(() => {
    setCards(loadCards());
  }, [pathname]);

  const slots = useMemo(() => Array.from({ length: 9 }).map((_, i) => i + 1), []);

  // map slot -> card (simple logic: first cards fill from slot1..)
  const slotToCard = useMemo(() => {
    const map = new Map<number, Card>();
    cards.forEach((c, idx) => {
      if (idx < 9) map.set(idx + 1, c);
    });
    return map;
  }, [cards]);

  return (
    <div className="px-6 pb-10">
      <h1 className="text-3xl font-semibold mb-6 text-center">My Wallet</h1>

      <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
        {slots.map((slot) => {
          const card = slotToCard.get(slot);

          // ✅ if card exists -> clickable card tile
          if (card) {
            return (
              <Link key={slot} href={`/card/${card.id}`} className="block">
                <Shell className="p-5 hover:bg-white/10 transition cursor-pointer">
                  <div className="text-sm opacity-80 mb-4 underline">
                    {card.name ?? "SolCard"}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 w-3 rounded-full bg-white/25 border border-white/10" />
                    <div className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      Slot{slot}
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="text-lg font-semibold">
                      Ending in {card.ending}
                    </div>

                    <div className="h-6 w-10 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80 opacity-90" />
                  </div>

                  <div className="mt-3 text-xs opacity-65">
                    {card.holder}
                  </div>
                </Shell>
              </Link>
            );
          }

          // ✅ empty slot -> clickable to /slot/[slot]
          return (
            <Link key={slot} href={`/slot/${slot}`} className="block">
              <div
                className={cn(
                  "rounded-2xl border border-dashed border-white/20 bg-white/0 h-[150px] relative overflow-hidden cursor-pointer",
                  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
                  "hover:border-white/35 hover:bg-white/[0.03] transition"
                )}
              >
                {/* subtle hover glow on dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-white/10 border border-white/10 transition hover:bg-white/15" />
                </div>

                {/* slot label */}
                <div className="absolute left-4 top-4 text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 opacity-75">
                  Slot{slot}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
