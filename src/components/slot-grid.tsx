"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/types";
import { loadCards } from "@/lib/cards-store";

type SlotItem = {
  slotLabel: string; // "Slot1"
  card?: Card;
};

const TOTAL_SLOTS = 12;

function normalizeSlot(v: any): string {
  if (!v) return "";
  const s = String(v).trim();
  // accepte "Slot2", "slot2", "2", 2
  if (/^\d+$/.test(s)) return `Slot${s}`;
  if (/^slot\s*\d+$/i.test(s)) return `Slot${s.replace(/slot/i, "").trim()}`;
  if (/^slot\d+$/i.test(s)) return `Slot${s.replace(/slot/i, "").trim()}`;
  if (/^Slot\d+$/.test(s)) return s;
  return s;
}

export function SlotGrid({
  className,
  total = TOTAL_SLOTS,
}: {
  className?: string;
  total?: number;
}) {
  const pathname = usePathname();

  const cards = useMemo(() => {
    // load from localStorage (mock removed)
    const list = loadCards();
    return Array.isArray(list) ? list : [];
  }, []);

  const slots: SlotItem[] = useMemo(() => {
    const allSlotLabels = Array.from({ length: total }, (_, i) => `Slot${i + 1}`);

    // 1) on indexe par slot si card.slot existe
    const bySlot = new Map<string, Card>();
    for (const c of cards) {
      const slot = normalizeSlot((c as any)?.slot);
      if (slot && !bySlot.has(slot)) bySlot.set(slot, c);
    }

    // 2) on remplit : si pas de slot -> fallback par ordre (sans casser l’UI)
    const unassigned = cards.filter((c) => {
      const slot = normalizeSlot((c as any)?.slot);
      return !slot || !bySlot.has(slot);
    });

    let cursor = 0;

    return allSlotLabels.map((slotLabel) => {
      const slotted = bySlot.get(slotLabel);
      if (slotted) return { slotLabel, card: slotted };

      const fallback = unassigned[cursor];
      if (fallback) {
        cursor += 1;
        return { slotLabel, card: fallback };
      }

      return { slotLabel };
    });
  }, [cards, total]);

  return (
    <div
      className={cn(
        "grid gap-5",
        // Responsive proche de ta capture (3 colonnes sur desktop)
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {slots.map(({ slotLabel, card }) => {
        const isFilled = !!card;

        // style carte (même taille rempli / vide)
        const CardShell = (
          <div
            className={cn(
              "relative w-full",
              "aspect-[1.86/1]", // ratio carte
              "rounded-2xl",
              "border border-white/10",
              "bg-[#0b0d12]",
              "shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
              "overflow-hidden"
            )}
          >
            {/* subtil gradient comme ta capture */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/50" />

            {/* header Slot + SolCard */}
            <div className="relative p-5">
              <div className="inline-flex items-center gap-2">
                <div className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/80">
                  {slotLabel}
                </div>
              </div>

              <div className="mt-2">
                <div className="text-[13px] font-semibold text-white/90 underline underline-offset-4">
                  SolCard
                </div>
              </div>

              {isFilled ? (
                <>
                  <div className="mt-10">
                    <div className="text-lg font-semibold text-white/90">
                      Ending in {card?.ending ?? "----"}
                    </div>
                    <div className="mt-2 text-[11px] tracking-wide text-white/65 font-semibold">
                      {card?.holder ?? ""}
                    </div>
                  </div>

                  {/* toggle jaune à droite */}
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <div className="h-7 w-14 rounded-full bg-white/10 border border-white/10 flex items-center px-1">
                      <div className="h-5 w-5 rounded-full bg-yellow-400 translate-x-7 shadow-[0_6px_20px_rgba(250,204,21,0.35)]" />
                    </div>
                  </div>
                </>
              ) : (
                // slot vide : rien, mais même taille + même coque
                <div className="mt-10 text-sm text-white/20 select-none">
                  {/* volontairement vide */}
                </div>
              )}
            </div>
          </div>
        );

        // Si une carte existe -> clickable vers /card/[id]
        if (isFilled && card?.id) {
          return (
            <Link
              key={slotLabel}
              href={`/card/${card.id}`}
              className={cn(
                "block",
                pathname?.startsWith(`/card/${card.id}`) ? "opacity-100" : "opacity-100",
                "hover:opacity-95 transition"
              )}
              aria-label={`Open ${slotLabel}`}
            >
              {CardShell}
            </Link>
          );
        }

        // Slot vide -> non cliquable mais même taille
        return (
          <div key={slotLabel} aria-label={`${slotLabel} empty`}>
            {CardShell}
          </div>
        );
      })}
    </div>
  );
}
