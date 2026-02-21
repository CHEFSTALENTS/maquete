"use client";

import Link from "next/link";
import { Shell } from "@/components/ui/card-shell";
import { cards } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function CardSlotPlaceholder({ index }: { index: number }) {
  const slotNumber = index + 1;

  return (
    <Link
      href={`/slot/${slotNumber}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl sc-glass sc-slot block",
        "aspect-[1.586/1]"
      )}
    >
      {/* dots */}
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-white/10 border border-white/10" />
      </div>

      <div className="absolute left-6 right-6 bottom-6 sc-divider opacity-70" />
    </Link>
  );
}

function ActiveCardSlot({ cardId }: { cardId: string }) {
  const active = cards.find((c) => c.id === cardId) ?? cards[0];

  return (
    <Link
      href={`/card/${active.id}`}
      className="col-span-1 aspect-[1.586/1] relative overflow-hidden rounded-2xl sc-glass block"
    >
      {/* fond interne */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.035] via-white/[0.02] to-white/[0.015]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute inset-0 rounded-2xl border border-white/10" />

      <div className="relative h-full p-6 flex flex-col">
        <div className="text-sm opacity-90 underline underline-offset-4">SolCard</div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-white/20 border border-white/10" />
          <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10">
            Slot1
          </div>
        </div>

        <div className="mt-auto">
          <div className="h-px bg-white/10 opacity-70" />
        </div>

        <div className="pt-4 flex items-end justify-between">
          <div className="text-2xl font-semibold leading-none">Ending in {active.ending}</div>

          <div className="relative h-7 w-12 translate-y-1">
            <div className="absolute right-3 top-0 h-7 w-7 rounded-full bg-orange-500/80" />
            <div className="absolute right-0 top-0 h-7 w-7 rounded-full bg-yellow-400/70 mix-blend-screen" />
          </div>
        </div>

        {/* petit feedback de hover */}
        <div className="absolute inset-0 opacity-0 transition-opacity duration-150 hover:opacity-100 pointer-events-none">
          <div className="absolute inset-0 bg-white/[0.02]" />
        </div>
      </div>
    </Link>
  );
}

export function SlotGrid() {
  const active = cards[0];
  const slots = Array.from({ length: 9 }).map((_, i) => i);

  return (
    <div className="px-6 pb-12">
      <h1 className="text-4xl font-semibold mb-6 text-center">My Wallet</h1>

      <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
        <ActiveCardSlot cardId={active.id} />
        {slots.slice(1).map((i) => (
          <CardSlotPlaceholder key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
