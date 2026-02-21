"use client";

import { useState } from "react";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";

export default function EmptySlotView({ slot }: { slot: string }) {
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  return (
    <div className="px-6 pb-12 max-w-5xl mx-auto">
      {/* header text + deposit button */}
      <div className="flex items-start justify-between mt-10 mb-8">
        <div>
          <div className="text-xl font-semibold">This card slot is unlocked!</div>
          <div className="text-sm opacity-70">Deposit to issue your SolCard!</div>
        </div>

        <button className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition">
          Deposit
        </button>
      </div>

      {/* card placeholder + arrows */}
      <div className="flex items-center justify-center gap-10 mb-8">
        <button className="h-9 w-12 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition flex items-center justify-center">
          ←
        </button>

        <div className="relative w-full max-w-[620px] aspect-[1.586/1] rounded-2xl overflow-hidden sc-glass sc-slot">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-28 rounded-full bg-white/10 border border-white/10" />
          </div>
        </div>

        <button className="h-9 w-12 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition flex items-center justify-center">
          →
        </button>
      </div>

      {/* progress line + amounts */}
      <div className="max-w-[760px] mx-auto mb-4">
        <div className="flex items-center justify-between text-sm opacity-80 mb-2">
          <div>Your monthly limit is not used</div>
          <div>$0 / $10,000</div>
        </div>

        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-white/35 w-[0%]" />
        </div>
      </div>

      {/* tabs */}
      <div className="max-w-[760px] mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setTab("transactions")}
            className={
              tab === "transactions"
                ? "py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
                : "py-2 rounded-lg bg-white/0 border border-white/10 text-sm opacity-80 hover:opacity-100"
            }
          >
            Transactions
          </button>

          <button
            onClick={() => setTab("topups")}
            className={
              tab === "topups"
                ? "py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
                : "py-2 rounded-lg bg-white/0 border border-white/10 text-sm opacity-80 hover:opacity-100"
            }
          >
            Topups
          </button>
        </div>

        {/* table container (SolCard-like) */}
       <Shell className="p-4 sc-glass">
  <TransactionsTable
    rows={[]}
    currency="USD"
    emptyText={tab === "transactions" ? "No transactions." : "No topups."}
  />
</Shell>
      </div>
    </div>
  );
}
