"use client";

import Link from "next/link";
import { Shell } from "@/components/ui/card-shell";
import { cards } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function CardSlotPlaceholder({ index }: { index: number }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl sc-glass sc-slot",
        "aspect-[1.586/1]" // ratio carte bancaire
      )}
    >
      {/* dots inside slot */}
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-white/10 border border-white/10" />
      </div>

      {/* petite ligne grise (comme sur SolCard) */}
      <div className="absolute left-6 right-6 bottom-6 sc-divider opacity-70" />
    </div>
  );
}

function ActiveCardSlot({ cardId }: { cardId: string }) {
  const active = cards.find((c) => c.id === cardId) ?? cards[0];

  return (
    <Shell className="p-6 col-span-1 aspect-[1.586/1] sc-glass">
      <div className="text-sm opacity-85 mb-5 underline underline-offset-4">
        SolCard
      </div>

      <div className="flex items-center gap-2 mb-5">
        <div className="h-3 w-3 rounded-full bg-white/20 border border-white/10" />
        <div className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
          Slot1
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="text-xl font-semibold">Ending in {active.ending}</div>
        {/* petit “mastercard-like” */}
        <div className="relative h-7 w-12">
          <div className="absolute right-2 top-0 h-7 w-7 rounded-full bg-orange-500/80" />
          <div className="absolute right-0 top-0 h-7 w-7 rounded-full bg-yellow-400/70 mix-blend-screen" />
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/card/${active.id}`}
          className="inline-flex text-sm opacity-80 hover:opacity-100 underline underline-offset-4"
        >
          Open card →
        </Link>
      </div>

      <div className="mt-auto pt-7">
        <div className="sc-divider opacity-70" />
      </div>
    </Shell>
  );
}

export function SlotGrid() {
  const active = cards[0];
  const slots = Array.from({ length: 9 }).map((_, i) => i);

  return (
    <div className="px-6 pb-12">
      <h1 className="text-4xl font-semibold mb-6 text-center">My Wallet</h1>

      {/* ✅ un peu plus large + look SolCard */}
      <div className="grid grid-cols-3 gap-6 max-w-6xl mx-auto">
        <ActiveCardSlot cardId={active.id} />
        {slots.slice(1).map((i) => (
          <CardSlotPlaceholder key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
