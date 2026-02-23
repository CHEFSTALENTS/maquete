"use client";

import { useMemo, useState, useEffect } from "react";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";
import type { Card } from "@/lib/mock-data";
import { loadCards } from "@/lib/cards-store";

export default function CardTabs({ cardId }: { cardId: string }) {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  useEffect(() => {
    setAllCards(loadCards());
  }, []);

  const card = useMemo(() => {
    return allCards.find((c) => c.id === cardId) ?? allCards[0];
  }, [allCards, cardId]);

  const rows = tab === "transactions" ? (card?.transactions ?? []) : (card?.topups ?? []);

  return (
    <div className="mt-6">
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

      <div className="mt-4">
        <Shell className="p-4 sc-glass border border-white/10 bg-white/5">
          <TransactionsTable
            rows={rows}
            currency="USD"
            emptyText={tab === "transactions" ? "No transactions." : "No topups."}
          />
        </Shell>
      </div>
    </div>
  );
}
