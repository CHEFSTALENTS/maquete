"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";
import { loadCards } from "@/lib/cards-store";

export default function CardTabs({ cardId }: { cardId: string }) {
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");
  const [version, setVersion] = useState(0);

  // ✅ refresh when localStorage changes (deposit / new card / etc.)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      // refresh only for our app key changes (safe even if null)
      setVersion((v) => v + 1);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const card = useMemo(() => {
    const all = loadCards();
    return all.find((c) => c.id === cardId) ?? all[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId, version]);

  const rows = tab === "transactions" ? card.transactions : card.topups;

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

      {/* table wrapper */}
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
