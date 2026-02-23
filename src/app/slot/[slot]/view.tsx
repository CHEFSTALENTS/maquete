"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";
import type { Card, Transaction } from "@/lib/mock-data";
import { createCardForSlot, loadCards, saveCards } from "@/lib/cards-store";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function EmptySlotView({ slot }: { slot: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  const [open, setOpen] = useState(false);
  const [feeEur, setFeeEur] = useState<150 | 250 | 400>(150);
  const [address, setAddress] = useState<string>("");
  const [generatedCard, setGeneratedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);

  function onGenerateClick() {
    const g = createCardForSlot(slot);

    setGeneratedCard(g.card);
    setAddress(g.solAddress);
    setOpen(true);
  }

  async function onConfirm() {
    if (!generatedCard) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const initial = randomInt(40, 60); // ✅ 40–60$

      const topup: Transaction = {
        id: `topup-${Date.now()}`,
        type: "Auth",
        status: "Succeed",
        description: "Topup - Card Funding",
        amount: initial,
        date: now,
      };

    const finalized: Card = {
  ...generatedCard,
  balance: initial,
  transactions: [], // ✅ 0 tx
  topups: [topup],  // ✅ topup auto = solde
};

      const current = loadCards();
      saveCards([finalized, ...current]);

      setOpen(false);
      router.push(`/card/${finalized.id}`);
    } finally {
      setLoading(false);
    }
  }

  const qrUrl = useMemo(() => {
    if (!address) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      address
    )}`;
  }, [address]);

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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* ✅ overlay non opaque + blur */}
         <div className="absolute inset-0 bg-black/95" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-[560px]">
<Shell className="p-5 bg-[#0b0d12] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)]">
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
                {/* ✅ fee dropdown */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">Issuance fee</div>

                  <select
                    value={feeEur}
                    onChange={(e) => setFeeEur(Number(e.target.value) as 150 | 250 | 400)}
                    className="mt-2 h-11 w-full rounded-lg bg-black/30 border border-white/10 px-3 text-sm outline-none"
                  >
                    <option value={150}>€150</option>
                    <option value={250}>€250</option>
                    <option value={400}>€400</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-3">Deposit address (Solana)</div>

                  {!!qrUrl && (
                    <div className="w-full flex justify-center mb-3">
                      <img
                        src={qrUrl}
                        alt="Solana deposit QR"
                        className="h-[220px] w-[220px] rounded-xl bg-white p-2"
                      />
                    </div>
                  )}

                  <div className="font-mono text-sm break-all">{address}</div>
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
