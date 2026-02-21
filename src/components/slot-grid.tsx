"use client";

import Link from "next/link";
import { Shell } from "@/components/ui/card-shell";
import { cards } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function SlotGrid() {
  const active = cards[0];

  const slots = Array.from({ length: 9 }).map((_, i) => i);
  return (
    <div className="px-6 pb-10">
      <h1 className="text-3xl font-semibold mb-6 text-center">My Wallet</h1>

      <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Slot 1 = carte */}
        <Shell className="p-5 col-span-1">
          <div className="text-sm opacity-80 mb-4 underline">SolCard</div>

          <div className="flex items-center gap-2 mb-4">
            <div className="h-3 w-3 rounded-full bg-white/20 border border-white/10" />
            <div className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
              Slot1
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div className="text-lg font-semibold">
              Ending in {active.ending}
            </div>
            <div className="h-6 w-10 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80 opacity-90" />
          </div>

          <div className="mt-4">
            <Link
              href={`/card/${active.id}`}
              className="inline-flex text-sm opacity-80 hover:opacity-100 underline"
            >
              Open card →
            </Link>
          </div>
        </Shell>

        {/* Placeholders */}
        {slots.slice(1).map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl border border-dashed border-white/20 bg-white/0 h-[150px] relative overflow-hidden",
              "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
            )}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-white/10 border border-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
