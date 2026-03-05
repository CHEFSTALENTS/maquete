"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionsTable } from "@/components/transactions-table";
import type { Card } from "@/lib/types";
import {
  createDraftCardForSlot,
  loadCards,
  saveCards,
  activateCard,
  type FeeEur,
} from "@/lib/cards-store";

export default function EmptySlotView({ slot }: { slot: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

  // ✅ draft card exists BEFORE activation payment
  const [draft, setDraft] = useState<Card | null>(null);
  const [address, setAddress] = useState<string>("");

  // ✅ activation modal opens ONLY when clicking "Activate card"
  const [activateOpen, setActivateOpen] = useState(false);

  const [feeEur, setFeeEur] = useState<FeeEur>(150);
  const [loading, setLoading] = useState(false);

  const qrUrl = useMemo(() => {
    if (!address) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      address
    )}`;
  }, [address]);

  function onGenerateClick() {
    const g = createDraftCardForSlot(slot);

    // ✅ store draft immediately (so it exists as a real card object)
    const current = loadCards();
    const withDraft = [g.card, ...current];
    saveCards(withDraft);

    setDraft(g.card);
    setAddress(g.solAddress);
    setFeeEur(150);
    setActivateOpen(false);
  }

  function onOpenActivate() {
    if (!draft) return;
    setActivateOpen(true);
  }

  async function onActivate() {
    if (!draft) return;
    setLoading(true);
    try {
      const current = loadCards();

      // ensure draft is present (avoid duplicates)
      const exists = current.some((c) => c.id === draft.id);
      const base = exists ? current : [draft, ...current];

      // activate (initial balance 40–60 + 1 topup), keep transactions empty
      const activated = activateCard(base, draft.id, feeEur);
      saveCards(activated);

      setActivateOpen(false);
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
          <div className="text-sm opacity-70">
            Generate a card, then activate it to receive your first balance.
          </div>
        </div>

        <button
          onClick={onGenerateClick}
          className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition"
        >
          Generate card
        </button>
      </div>

      {/* ✅ After generating: show CTA to activate (below, like you asked) */}
      {draft && (
        <div className="max-w-[760px] mx-auto mb-8">
          <div className="rounded-2xl border border-white/10 bg-[#0f1115] shadow-[0_16px_55px_rgba(0,0,0,0.55)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm opacity-70">Card generated</div>
                <div className="text-lg font-semibold mt-1">
                  SolCard •••• {draft.ending}
                </div>
                <div className="text-xs text-white/45 mt-1">
                  Status: <span className="text-amber-200/90">Pending activation</span>
                </div>
              </div>

              <button
                onClick={onOpenActivate}
                className="h-11 px-5 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition"
              >
                Activate card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* empty tables (slot view stays empty) */}
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

      {/* ✅ Activation modal (FULL opaque) */}
      {activateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* overlay (strong, no bleed) */}
          <div
            className="absolute inset-0 bg-black/95"
            onClick={() => !loading && setActivateOpen(false)}
          />

          <div className="relative w-full max-w-[560px]">
            <div className="rounded-2xl border border-white/10 bg-[#0f1115] shadow-[0_20px_70px_rgba(0,0,0,0.75)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Activate your SolCard</div>
                  <div className="text-sm opacity-70 mt-1">
                    Pay the activation fee to receive your first balance (40–60 USD).
                  </div>
                </div>

                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
                  onClick={() => setActivateOpen(false)}
                  disabled={loading}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                {/* Fee selector */}
                <div className="rounded-xl border border-white/10 bg-[#141822] p-4">
                  <div className="text-xs opacity-70">Activation fee</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-2xl font-semibold">€{feeEur}</div>

                    <select
                      className="h-10 rounded-lg bg-black/30 border border-white/10 px-3 text-sm outline-none"
                      value={feeEur}
                      onChange={(e) => setFeeEur(Number(e.target.value) as FeeEur)}
                      disabled={loading}
                    >
                      <option value={150}>150€</option>
                      <option value={250}>250€</option>
                      <option value={400}>400€</option>
                    </select>
                  </div>
                </div>

                {/* Address + QR */}
                <div className="rounded-xl border border-white/10 bg-[#141822] p-4">
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
                    className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
                    onClick={() => setActivateOpen(false)}
                    disabled={loading}
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

                {/* ✅ removed any visible “simulation/mock” text */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
