"use client";

import { useMemo, useState } from "react";
import { cards } from "@/lib/mock-data";
import { TransactionsTable } from "@/components/transactions-table";

export default function CardTabs({
  cardId,
  onOpenError,
}: {
  cardId: string;
  onOpenError?: () => void;
}) {
  const card = useMemo(() => cards.find((c) => c.id === cardId) ?? cards[0], [cardId]);
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

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
        <TransactionsTable
          rows={tab === "transactions" ? card.transactions : card.topups}
          currency="USD"
          emptyText={tab === "transactions" ? "No transactions." : "No topups."}
          onStatusClick={(row) => {
            if (row.status === "Failed") onOpenError?.();
          }}
        />
      </div>
    </div>
  );
}
