"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/mock-data";
import { loadCards } from "@/lib/cards-store";

export function SlotGrid() {
  const pathname = usePathname();
  const [cards, setCards] = useState<Card[]>(() => loadCards());

  useEffect(() => {
    setCards(loadCards());
  }, [pathname]);

  const slots = useMemo(() => Array.from({ length: 9 }).map((_, i) => i + 1), []);

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

          // ✅ Card tile (opaque + same size as empty slots)
          if (card) {
            return (
              <Link key={slot} href={`/card/${card.id}`} className="block">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10",
                    "bg-[#151820] shadow-[0_10px_40px_rgba(0,0,0,0.45)]", // ✅ opaque
                    "hover:shadow-[0_14px_60px_rgba(0,0,0,0.55)] transition",
                    "cursor-pointer",
                    "aspect-[1.586/1]" // ✅ same size as empty slot
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/45" />

                  <div className="absolute left-4 top-4 text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 opacity-85">
                    Slot{slot}
                  </div>

                  <div className="absolute left-5 top-12 text-sm opacity-80 underline">
                    {card.name ?? "SolCard"}
                  </div>

                  <div className="absolute left-5 bottom-6">
                    <div className="text-lg font-semibold">
                      Ending in {card.ending}
                    </div>
                    <div className="mt-2 text-xs opacity-65">{card.holder}</div>
                  </div>

                  <div className="absolute right-5 bottom-6 h-6 w-10 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80 opacity-90" />
                </div>
              </Link>
            );
          }

          // ✅ Empty slot tile (same size)
          return (
            <Link key={slot} href={`/slot/${slot}`} className="block">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/0",
                  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
                  "hover:border-white/35 hover:bg-white/[0.03] transition",
                  "cursor-pointer",
                  "aspect-[1.586/1]"
                )}
              >
                <div className="absolute left-4 top-4 text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 opacity-75">
                  Slot{slot}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-white/10 border border-white/10 transition hover:bg-white/15" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
