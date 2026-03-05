"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { loadCards } from "@/lib/cards-store";
import type { Card } from "@/lib/types";

const TOTAL_SLOTS = 9;

function slotLabel(i: number) {
  return `Slot ${i}`;
}
function slotKey(i: number) {
  return `Slot${i}`;
}
function slotHref(i: number) {
  return `/slot/slot${i}`;
}

function normalizeSlot(v: any): string {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return `Slot${s}`;
  if (/^slot\s*\d+$/i.test(s)) return `Slot${s.replace(/slot/i, "").trim()}`;
  if (/^slot\d+$/i.test(s)) return `Slot${s.replace(/slot/i, "").trim()}`;
  return s;
}

function MastercardMark() {
  return (
    <div className="relative h-8 w-14">
      <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-red-500/90" />
      <div className="absolute left-4 top-0 h-8 w-8 rounded-full bg-yellow-400/90 mix-blend-screen" />
    </div>
  );
}

export function SlotGrid({ className }: { className?: string }) {
  const cards = useMemo(() => {
    const list = loadCards();
    return Array.isArray(list) ? (list as Card[]) : [];
  }, []);

  const slots = useMemo(() => {
    const labels = Array.from({ length: TOTAL_SLOTS }, (_, idx) => slotKey(idx + 1));

    const bySlot = new Map<string, Card>();
    for (const c of cards) {
      const s = normalizeSlot((c as any)?.slot);
      if (s && !bySlot.has(s)) bySlot.set(s, c);
    }

    const unassigned = cards.filter((c) => {
      const s = normalizeSlot((c as any)?.slot);
      return !s || !bySlot.has(s);
    });

    let cursor = 0;

    return labels.map((s) => {
      const direct = bySlot.get(s);
      if (direct) return { slot: s, card: direct };

      const fb = unassigned[cursor];
      if (fb) {
        cursor += 1;
        return { slot: s, card: fb };
      }

      return { slot: s, card: undefined as Card | undefined };
    });
  }, [cards]);

  return (
    <div
      className={cn(
        // ✅ 3x3
        "grid grid-cols-3 gap-8",
        // ✅ largeur max proche de ton rendu, et centré
        "mx-auto w-full max-w-[1200px]",
        className
      )}
    >
      {slots.map(({ slot, card }, idx) => {
        const i = idx + 1;
        const filled = !!card?.id;
        const href = filled ? `/card/${card!.id}` : slotHref(i);

        return (
          <Link
            key={slot}
            href={href}
            className={cn(
              "group block rounded-2xl",
              // ✅ look clean / flat (pas de pointillé, pas de cercle)
              "border border-white/10 bg-white/[0.02]",
              "hover:bg-white/[0.03] hover:border-white/15 transition",
              "shadow-[0_14px_55px_rgba(0,0,0,0.35)]"
            )}
          >
            {/* ✅ Taille carte : on force une hauteur stable (beaucoup plus “card-like” que aspect-ratio) */}
            <div className="relative h-[190px] rounded-2xl overflow-hidden">
              {/* subtle vignette like the original */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/30" />

              {/* labels (top-left) */}
              <div className="absolute left-6 top-6">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[12px] font-semibold text-white/80">
                  {slotLabel(i)}
                </div>

                <div className="mt-3 text-[13px] font-semibold text-white/80 underline underline-offset-4 decoration-white/45 group-hover:decoration-white/70 transition">
                  SolCard
                </div>
              </div>

              {/* filled card content */}
              {filled ? (
                <div className="absolute left-6 right-6 bottom-6 flex items-end justify-between">
                  <div>
                    <div className="text-[22px] font-semibold text-white/90">
                      Ending in {card!.ending ?? "----"}
                    </div>
                    <div className="mt-2 text-[11px] tracking-wide font-semibold text-white/60 uppercase">
                      {card!.holder ?? ""}
                    </div>
                  </div>

                  <div className="translate-y-1">
                    <MastercardMark />
                  </div>
                </div>
              ) : (
                // ✅ slot vide = juste vide, mais cliquable (aucun icon)
                <div className="absolute inset-0" />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
