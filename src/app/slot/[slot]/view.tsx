"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";
import { createCardForSlot, loadCards, saveCards } from "@/lib/cards-store";

export default function EmptySlotView({ slot }: { slot: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  const [open, setOpen] = useState(false);
  const [feeUsd, setFeeUsd] = useState<number>(10);
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function onGenerateClick() {
    const g = createCardForSlot(slot);
    setFeeUsd(g.feeUsd);
    setAddress(g.solAddress);
    setOpen(true);
  }

  async function onConfirm() {
    setLoading(true);
    try {
      const g = createCardForSlot(slot);
      const current = loadCards();
      const next = [g.card, ...current];
      saveCards(next);
      setOpen(false);
      router.push(`/card/${g.card.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mt-10 mb-8">
        <div>
          <div className="text-xl font-semibold">This card slot is unlocked!</div>
          <div className="text-sm opacity-70">Deposit to issue your SolCard!</div>
        </div>

        <button
          onClick={onGenerateClick}
          className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition"
        >
          Generate card
        </button>
      </div>

      {/* ... ton bloc carte placeholder + progress + tabs ... */}

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

        <TransactionsTable
          rows={[]}
          currency="USD"
          emptyText={tab === "transactions" ? "No transactions." : "No topups."}
        />
      </div>

      {/* ✅ Modal deposit/activation */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[560px]">
            <Shell className="p-5 bg-[#0f1115] border border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Activate your SolCard</div>
                  <div className="text-sm opacity-70 mt-1">
                    Pay the issuance fee, then we’ll generate your card details.
                  </div>
                </div>
                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">Issuance fee</div>
                  <div className="text-2xl font-semibold mt-1">${feeUsd.toFixed(2)}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">Deposit address (Solana)</div>
                  <div className="mt-2 font-mono text-sm break-all">{address}</div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95 disabled:opacity-50"
                    onClick={onConfirm}
                    disabled={loading}
                  >
                    {loading ? "Activating..." : "I have deposited — Activate"}
                  </button>
                </div>
              </div>
            </Shell>
          </div>
        </div>
      )}
    </div>
  );
}
