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

/**
 * ✅ Target circle = cercle + mire À L’INTÉRIEUR (pas une croix dans le slot)
 */
function TargetCircle() {
  return (
    <div className="relative h-24 w-24 rounded-full bg-white/7 border border-white/12">
      {/* mire verticale (dans le cercle seulement) */}
      <div className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-white/10" />
      {/* mire horizontale (dans le cercle seulement) */}
      <div className="absolute top-1/2 left-3 right-3 h-px -translate-y-1/2 bg-white/10" />
      {/* petit point central */}
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/12" />
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

        const Wrapper = filled ? Link : Link;
        const href = filled ? `/card/${card!.id}` : slotHref(i);

        return (
          <Wrapper
            key={slot}
            href={href}
            className={cn(
              "group block rounded-2xl",
              // ✅ flat/wireframe like original
              "border border-white/10 bg-white/[0.02]",
              "hover:bg-white/[0.03] hover:border-white/15 transition",
              "shadow-[0_10px_40px_rgba(0,0,0,0.22)]"
            )}
          >
            <div className="relative aspect-[2.25/1] rounded-2xl overflow-hidden">
              {/* ✅ inner dashed frame (plus visible) */}
              <div className="absolute inset-5 rounded-2xl border border-dashed border-white/25" />

              {/* ✅ target circle centered (original look) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90">
                <TargetCircle />
              </div>

              {/* TOP LEFT LABELS */}
              <div className="absolute left-6 top-6">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[12px] font-semibold text-white/80">
                  {slotLabel(i)}
                </div>

                {/* ✅ SolCard underline color like original (not purple) */}
                <div className="mt-3 text-[13px] font-semibold text-white/80 underline underline-offset-4 decoration-white/45 group-hover:decoration-white/70 transition">
                  SolCard
                </div>
              </div>

              {/* FILLED CARD CONTENT (overlay like original) */}
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
              ) : null}
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}
