"use client";

import { useMemo, useState } from "react";
import { cards } from "@/lib/mock-data";
import { TransactionsTable } from "@/components/transactions-table";

export default function CardTabs({ cardId }: { cardId: string }) {
  const card = useMemo(
    () => cards.find((c) => c.id === cardId) ?? cards[0],
    [cardId]
  );

  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  const rows = tab === "transactions" ? card.transactions : card.topups;

  return (
    <div className="mt-8 max-w-[900px] mx-auto">
      {/* Segmented tabs (SolCard-like) */}
      <div className="flex items-center justify-center">
        <div className="w-full max-w-[820px] rounded-lg border border-white/10 bg-white/5 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setTab("transactions")}
              className={
                tab === "transactions"
                  ? "h-11 rounded-md bg-white/10 border border-white/10 text-sm font-medium text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "h-11 rounded-md bg-transparent text-sm text-white/65 hover:text-white/90 hover:bg-white/5 transition"
              }
            >
              Transactions
            </button>

            <button
              onClick={() => setTab("topups")}
              className={
                tab === "topups"
                  ? "h-11 rounded-md bg-white/10 border border-white/10 text-sm font-medium text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  : "h-11 rounded-md bg-transparent text-sm text-white/65 hover:text-white/90 hover:bg-white/5 transition"
              }
            >
              Topups
            </button>
          </div>
        </div>
      </div>

      {/* Table (NO extra Shell wrapper -> avoids “everything in a frame”) */}
      <div className="mt-4 max-w-[820px] mx-auto">
        <TransactionsTable
          rows={rows}
          currency="USD"
          emptyText={tab === "transactions" ? "No transactions." : "No topups."}
        />
      </div>
    </div>
  );
}
