"use client";

import { useEffect, useMemo, useState } from "react";
import { TransactionsTable } from "@/components/transactions-table";
import type { Card, Transaction } from "@/lib/types";
import { loadCards } from "@/lib/cards-store";

export default function CardTabs({ cardId }: { cardId: string }) {
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");
  const [cards, setCards] = useState<Card[]>(() => loadCards());

  // ✅ Always reload from storage on mount + when storage changes (other tab / action)
  useEffect(() => {
    const refresh = () => setCards(loadCards());

    refresh();

    // storage event triggers only across tabs/windows
    window.addEventListener("storage", refresh);

    // optional: local event you can dispatch after saveCards (if you already do)
    window.addEventListener("solcard:cards:changed" as any, refresh);
window.dispatchEvent(new Event("solcard:cards:changed"));
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("solcard:cards:changed" as any, refresh);
    };
  }, []);

  const card = useMemo(() => {
    return cards.find((c) => c.id === cardId) || null;
  }, [cards, cardId]);

  const txRows: Transaction[] = useMemo(() => {
    if (!card) return [];
    return Array.isArray(card.transactions) ? card.transactions : [];
  }, [card]);

 const topupRows: Transaction[] = useMemo(() => {
  if (!card) return [];

  // ✅ plus besoin de card.topups (donc plus d'erreur TS)
  const txs = Array.isArray(card.transactions) ? card.transactions : [];
  return txs.filter((t) => t.type === "Topup");
}, [card]);

  const rows = tab === "transactions" ? txRows : topupRows;

  return (
    <div>
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

      <TransactionsTable
        rows={rows}
        currency="USD"
        emptyText={
          tab === "transactions"
            ? "Aucune transaction sur cette carte."
            : "Aucun dépôt (TopUp) sur cette carte."
        }
      />
    </div>
  );
}
