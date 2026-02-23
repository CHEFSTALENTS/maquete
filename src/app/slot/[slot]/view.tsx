"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/ui/card-shell";
import { TransactionsTable } from "@/components/transactions-table";
import type { Card } from "@/lib/mock-data";
import {
  createDraftCardForSlot,
  loadCards,
  saveCards,
  activateCard,
  type ActivationFeeEur,
} from "@/lib/cards-store";

export default function EmptySlotView({ slot }: { slot: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Card | null>(null);
  const [address, setAddress] = useState<string>("");

  const [feeEur, setFeeEur] = useState<ActivationFeeEur>(150);
  const [loading, setLoading] = useState(false);

  const qrUrl = useMemo(() => {
    if (!address) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}`;
  }, [address]);

  function onGenerateClick() {
    const g = createDraftCardForSlot(slot);
    setDraft(g.card);
    setAddress(g.solAddress);
    setFeeEur(150);
    setOpen(true);
  }

  async function onActivate() {
    if (!draft) return;
    setLoading(true);
    try {
      const current = loadCards();
      const next = [draft, ...current];
      // persist draft first
      saveCards(next);

      // activate (adds initial balance + 1 topup)
      const activated = activateCard(next, draft.id, feeEur);
      saveCards(activated);

      setOpen(false);
      router.push(`/card/${draft.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mt-10 mb-8">
        <div>
          <div className="text-xl font-semibold">This card slot is unlocked!</div>
          <div className="text-sm opacity-70">Generate a card, then activate it to receive your first balance.</div>
        </div>

        <button
          onClick={onGenerateClick}
          className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition"
        >
          Generate card
        </button>
      </div>

      {/* empty tables (new card = no tx/topups here) */}
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

      {/* ✅ Activation modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[560px]">
            <Shell className="p-5 bg-[#0f1115] border border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Activate your SolCard</div>
                  <div className="text-sm opacity-70 mt-1">
                    Pay the activation fee to receive your first balance (40–60 USD).
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
                {/* Fee selector */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">Activation fee</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-2xl font-semibold">€{feeEur}</div>
                    <select
                      className="h-10 rounded-lg bg-black/30 border border-white/10 px-3 text-sm outline-none"
                      value={feeEur}
                      onChange={(e) => setFeeEur(Number(e.target.value) as ActivationFeeEur)}
                    >
                      <option value={150}>150€</option>
                      <option value={250}>250€</option>
                      <option value={400}>400€</option>
                    </select>
                  </div>
                </div>

                {/* Address + QR */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-3">Deposit address (Solana)</div>

                  {qrUrl && (
                    <div className="w-full flex justify-center mb-3">
                      <img
                        src={qrUrl}
                        alt="Solana deposit QR"
                        className="h-[220px] w-[220px] rounded-xl bg-white p-2"
                      />
                    </div>
                  )}

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
                    onClick={onActivate}
                    disabled={loading || !draft}
                  >
                    {loading ? "Activating..." : "I have paid — Activate"}
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
