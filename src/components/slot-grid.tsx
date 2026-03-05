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
    <div className={cn("grid grid-cols-3 gap-7", className)}>
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
                "rounded-2xl border border-white/10 bg-[#0b0d12]/40",
                "hover:border-white/20 hover:bg-[#0b0d12]/55 transition",
                "shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
              )}
            >
              <div className="relative aspect-[2.15/1] rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/50" />

                <div className="relative h-full px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[12px] font-semibold text-white/80">
                        {slotLabel(i)}
                      </div>

                      {/* ✅ underline couleur correcte (pas violet) */}
                      <div
                        className={cn(
                          "mt-3 text-[13px] font-semibold text-white/85",
                          "underline underline-offset-4 decoration-white/50",
                          "group-hover:decoration-white/70 transition"
                        )}
                      >
                        SolCard
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-white/90">
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
                </div>
              </div>
            </Link>
          );
        }

        // ✅ slot vide (sans croix)
        return (
          <Link
            key={slot}
            href={slotHref(i)}
            className="group block rounded-2xl"
            aria-label={`${slotLabel(i)} empty - create card`}
          >
            <div
              className={cn(
                "relative aspect-[2.15/1] rounded-2xl overflow-hidden",
                "border border-white/10 bg-[#0b0d12]/25",
                "hover:bg-[#0b0d12]/35 hover:border-white/15 transition",
                "shadow-[0_10px_40px_rgba(0,0,0,0.20)]"
              )}
            >
              {/* cadre pointillé interne */}
              <div className="absolute inset-4 rounded-2xl border border-dashed border-white/25" />

              {/* ✅ cercle central uniquement (pas de croix) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="h-20 w-20 rounded-full bg-white/10 border border-white/10" />
              </div>

              <div className="absolute left-6 top-6">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[12px] font-semibold text-white/70">
                  {slotLabel(i)}
                </div>

                <div
                  className={cn(
                    "mt-3 text-[13px] font-semibold text-white/75",
                    "underline underline-offset-4 decoration-white/40",
                    "opacity-0 group-hover:opacity-100",
                    "group-hover:decoration-white/60 transition"
                  )}
                >
                  SolCard
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
