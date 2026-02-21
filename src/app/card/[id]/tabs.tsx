"use client";

import { useMemo, useState } from "react";
import { cards } from "@/lib/mock-data";
import { TransactionsTable } from "@/components/transactions-table";

export default function CardTabs({ cardId }: { cardId: string }) {
  const card = useMemo(() => cards.find((c) => c.id === cardId) ?? cards[0], [cardId]);
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  return (
    <div className="mt-8">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setTab("transactions")}
          className={
            tab === "transactions"
              ? "px-5 py-2 rounded-lg border text-sm transition bg-white/10 border-white/15"
              : "px-5 py-2 rounded-lg border text-sm transition bg-white/0 border-white/10 opacity-80 hover:opacity-100"
          }
        >
          Transactions
        </button>

        <button
          onClick={() => setTab("topups")}
          className={
            tab === "topups"
              ? "px-5 py-2 rounded-lg border text-sm transition bg-white/10 border-white/15"
              : "px-5 py-2 rounded-lg border text-sm transition bg-white/0 border-white/10 opacity-80 hover:opacity-100"
          }
        >
          Topups
        </button>
      </div>

      {tab === "transactions" ? (
        <TransactionsTable rows={card.transactions} currency="USD" />
      ) : (
        <TransactionsTable rows={card.topups} currency="USD" />
      )}
    </div>
  );
}
