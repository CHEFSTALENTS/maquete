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

  // accepte: "Slot 2", "Slot2", "slot2", "2"
  if (/^\d+$/.test(s)) return `Slot${s}`;
  if (/^slot\s*\d+$/i.test(s)) return `Slot${s.replace(/slot/i, "").trim()}`;
  if (/^slot\d+$/i.test(s)) return `Slot${s.replace(/slot/i, "").trim()}`;

  return s;
}

export function SlotGrid({ className }: { className?: string }) {
  const cards = useMemo(() => {
    const list = loadCards();
    return Array.isArray(list) ? list : [];
  }, []);

  const slots = useMemo(() => {
    const labels = Array.from({ length: TOTAL_SLOTS }, (_, idx) => slotKey(idx + 1));

    // 1) mapping par slot si card.slot existe
    const bySlot = new Map<string, Card>();
    for (const c of cards) {
      const s = normalizeSlot((c as any)?.slot);
      if (s && !bySlot.has(s)) bySlot.set(s, c);
    }

    // 2) fallback: cartes sans slot -> on les place dans les slots libres
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
        "grid gap-6",
        // ✅ 3 colonnes en desktop => 3×3
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {slots.map(({ slot, card }, idx) => {
        const i = idx + 1;
        const filled = !!card?.id;

        if (filled) {
          return (
            <Link
              key={slot}
              href={`/card/${card!.id}`}
              className={cn(
                "group block",
                "rounded-2xl border border-white/10 bg-white/0",
                "hover:border-white/20 hover:bg-white/[0.03] transition"
              )}
            >
              <div className="relative aspect-[1.86/1] rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/50" />

                <div className="relative h-full p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-white/80">
                        {slotLabel(i)}
                      </div>

                      <div className="mt-2 text-[13px] font-semibold text-white/90 underline underline-offset-4">
                        SolCard
                      </div>
                    </div>

                    <div className="mt-1 flex items-center">
                      <div className="relative h-7 w-12">
                        <div className="absolute left-0 top-0 h-7 w-7 rounded-full bg-red-500/90" />
                        <div className="absolute left-4 top-0 h-7 w-7 rounded-full bg-yellow-400/90 mix-blend-screen" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10">
                    <div className="text-lg font-semibold text-white/90">
                      Ending in {card!.ending ?? "----"}
                    </div>
                    <div className="mt-2 text-[11px] tracking-wide font-semibold text-white/65">
                      {card!.holder ?? ""}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        }

        // ✅ slot vide cliquable (placeholder dashed + gros cercle)
        return (
          <Link
            key={slot}
            href={slotHref(i)}
            className={cn("group block rounded-2xl hover:opacity-95 transition")}
            aria-label={`${slotLabel(i)} empty - create card`}
          >
            <div
              className={cn(
                "relative aspect-[1.86/1] rounded-2xl overflow-hidden",
                "border border-white/10 bg-white/[0.01]"
              )}
            >
              {/* dashed frame comme sur ta capture */}
              <div className="absolute inset-3 rounded-2xl border border-dashed border-white/20" />

              {/* guides en pointillés (très proche du rendu) */}
              <div className="absolute left-1/2 top-3 bottom-3 w-px border-l border-dashed border-white/10" />
              <div className="absolute top-1/2 left-3 right-3 h-px border-t border-dashed border-white/10" />

              {/* gros cercle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-white/10 border border-white/10" />
              </div>

              <div className="absolute left-5 top-5">
                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/40 group-hover:text-white/60 transition">
                  {slotLabel(i)}
                </div>
              </div>

              <div className="absolute bottom-5 left-5 text-xs text-white/30 group-hover:text-white/55 transition">
                Click to create
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
