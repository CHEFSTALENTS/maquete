"use client";

import { useMemo, useState } from "react";
import { cards } from "@/lib/mock-data";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";

export default function CardTabs({ cardId }: { cardId: string }) {
  const card = useMemo(() => cards.find((c) => c.id === cardId) ?? cards[0], [cardId]);
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  return (
    <div className="mt-6">
      {/* tabs centered */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setTab("transactions")}
          className={
            tab === "transactions"
              ? "px-6 py-2 rounded-lg border text-sm transition bg-white/10 border-white/15"
              : "px-6 py-2 rounded-lg border text-sm transition bg-white/0 border-white/10 opacity-80 hover:opacity-100 hover:bg-white/5"
          }
        >
          Transactions
        </button>

        <button
          onClick={() => setTab("topups")}
          className={
            tab === "topups"
              ? "px-6 py-2 rounded-lg border text-sm transition bg-white/10 border-white/15"
              : "px-6 py-2 rounded-lg border text-sm transition bg-white/0 border-white/10 opacity-80 hover:opacity-100 hover:bg-white/5"
          }
        >
          Topups
        </button>
      </div>

      {/* filters row like SolCard */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <input
          className="w-full max-w-[520px] h-10 rounded-lg bg-white/0 border border-white/15 px-3 text-sm outline-none placeholder:text-white/40"
          placeholder="Filter statuses..."
        />
        <button className="h-10 px-4 rounded-lg bg-white/0 border border-white/15 text-sm hover:bg-white/5 transition flex items-center gap-2">
          Columns <span className="opacity-70">▾</span>
        </button>
      </div>

      {/* table wrapper */}
      <div className="mt-4">
        <Shell className="p-4 sc-glass border border-white/10 bg-white/5">
          <TransactionsTable
            rows={tab === "transactions" ? card.transactions : card.topups}
            currency="USD"
            emptyText={tab === "transactions" ? "No transactions." : "No topups."}
          />
        </Shell>
      </div>
    </div>
  );
}
