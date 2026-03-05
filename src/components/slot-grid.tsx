"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/types";
import { loadCards } from "@/lib/cards-store";

type SlotItem =
  | { kind: "card"; slotIndex: number; card: Card }
  | { kind: "empty"; slotIndex: number };

const TOTAL_SLOTS = 6; // ✅ ajuste ici si tu veux 8, 10, etc.

function sortCardsStable(cards: Card[]) {
  // On garde l’ordre d’insertion si tu veux, sinon tri par id
  // Ici : tri par id pour éviter les mouvements bizarres
  return [...cards].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function SlotGrid({ totalSlots = TOTAL_SLOTS }: { totalSlots?: number }) {
  const pathname = usePathname();
  const cards = useMemo(() => sortCardsStable(loadCards()), []);

  const slots: SlotItem[] = useMemo(() => {
    const items: SlotItem[] = [];

    for (let i = 0; i < totalSlots; i++) {
      const card = cards[i];
      if (card) items.push({ kind: "card", slotIndex: i, card });
      else items.push({ kind: "empty", slotIndex: i });
    }

    return items;
  }, [cards, totalSlots]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {slots.map((s) => {
        // ✅ route “open slot”
        // Adapte si chez toi c’est /slots/[id] ou /wallet/slot/[id]
        const slotHref = `/slot/${s.slotIndex + 1}`;

        if (s.kind === "empty") {
          return (
            <Link
              key={`empty-${s.slotIndex}`}
              href={slotHref}
              className={cn(
                "group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition",
                "p-4 min-h-[130px] flex flex-col justify-between"
              )}
            >
              <div className="text-sm font-semibold opacity-80">Empty slot</div>
              <div className="text-xs opacity-60 leading-5">
                Tap to create a new SolCard.
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs opacity-60">Slot #{s.slotIndex + 1}</div>
                <div className="h-9 px-3 rounded-lg bg-white text-black text-xs font-semibold flex items-center">
                  Create
                </div>
              </div>
            </Link>
          );
        }

        const cardHref = `/card/${s.card.id}`;
        const active = pathname?.startsWith(cardHref);

        return (
          <Link
            key={s.card.id}
            href={cardHref}
            className={cn(
              "rounded-2xl border transition p-4 min-h-[130px] flex flex-col justify-between",
              active ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{s.card.holder}</div>
                <div className="text-xs opacity-60 mt-1">
                  •••• {s.card.ending} — exp {s.card.expires}
                </div>
              </div>

              <div className="text-xs opacity-60">Slot #{s.slotIndex + 1}</div>
            </div>

            <div className="mt-4">
              <div className="text-xs opacity-60">Balance</div>
              <div className="text-base font-semibold">
                {Number(s.card.balance ?? 0).toFixed(2)} USD
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
