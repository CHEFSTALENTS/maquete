"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";
import type { Card } from "@/lib/mock-data";
import {
  loadCards,
  saveCards,
  generateSolanaAddress,
  depositToCard,
} from "@/lib/cards-store";

/**
 * ✅ expects pan like "1234 5678 9012 3456"
 */
function splitPan(pan: string) {
  const parts = pan.trim().split(/\s+/);
  return {
    g1: parts[0] ?? "0000",
    g2: parts[1] ?? "0000",
    g3: parts[2] ?? "0000",
    g4: parts[3] ?? "0000",
  };
}

const FEE_OPTIONS = [150, 250, 400] as const;

export default function CardPage() {
  const params = useParams<{ id: string }>();

  const [allCards, setAllCards] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState(false);

  // ✅ Deposit modal state
  const [depositOpen, setDepositOpen] = useState(false);
  const [feeEur, setFeeEur] = useState<(typeof FEE_OPTIONS)[number]>(150);
  const [solAddress, setSolAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("50");
  const [loading, setLoading] = useState(false);

  // init cards
  useEffect(() => {
    setAllCards(loadCards());
  }, []);

  const card = useMemo(() => {
    const id = params?.id;
    const list = allCards.length ? allCards : loadCards();
    return list.find((c) => c.id === id) ?? list[0];
  }, [allCards, params?.id]);

  const pct = useMemo(() => {
    const limit = card?.depositLimit ?? 1;
    const used = card?.depositUsed ?? 0;
    return Math.round((used / limit) * 100);
  }, [card]);

  const pan = card?.pan ?? `0000 0000 0000 ${card?.ending ?? "0000"}`;
  const cvv = card?.cvv ?? "123";
  const { g1, g2, g3, g4 } = splitPan(pan);

  function openDeposit() {
    // ✅ new address each time you open deposit
    setSolAddress(generateSolanaAddress());
    setAmount("50");
    setFeeEur(150);
    setDepositOpen(true);
  }

  function closeDeposit() {
    setDepositOpen(false);
  }

  async function confirmDeposit() {
    const n = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;

    setLoading(true);
    try {
      // ✅ adds to existing balance + writes TopUp row with now() date/time
      const next = depositToCard(allCards.length ? allCards : loadCards(), card.id, n);
      setAllCards(next);
      saveCards(next);
      setDepositOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const qrUrl = solAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        solAddress
      )}`
    : "";

  if (!card) return null;

  return (
    <DottedBackground>
      <TopNav />

      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {/* top row */}
        <div className="mt-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="text-sm opacity-70 hover:opacity-100 transition"
            >
              ← Back
            </Link>

            <button
              onClick={openDeposit}
              className="ml-4 h-10 px-5 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition"
            >
              Deposit
            </button>

            <button className="h-10 px-5 rounded-lg bg-white/0 border border-white/15 text-sm opacity-90 hover:bg-white/5 transition">
              Withdraw/Transfer
            </button>

            <button className="h-10 w-10 rounded-lg bg-white/0 border border-white/15 text-sm opacity-80 hover:bg-white/5 transition">
              …
            </button>
          </div>

          <div className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center text-sm font-semibold">
            {formatMoney(card.balance, "USD")}
          </div>
        </div>

        {/* card area */}
        <div className="mt-10 flex items-center justify-center gap-10">
          <button
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Previous card"
          >
            ←
          </button>

          {/* ✅ card (opaque, no dots visible through) */}
          <div
            className="
              relative
              w-full
              max-w-[480px]
              aspect-[1.586/1]
              rounded-2xl
              overflow-hidden
              border border-white/10
              bg-[#16181d]
              shadow-[0_10px_40px_rgba(0,0,0,0.6)]
            "
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/45" />

            <div className="absolute left-5 top-4 flex items-center gap-3">
              <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs">
                Billing
              </div>

              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="h-7 w-7 rounded-md bg-white/0 hover:bg-white/10 transition flex items-center justify-center"
                aria-label={revealed ? "Hide card details" : "Show card details"}
                title={revealed ? "Hide" : "Show"}
              >
                {revealed ? (
                  // eye
                  <svg
                    className="w-4 h-4 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                ) : (
                  // eye-off
                  <svg
                    className="w-4 h-4 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.5 10.5a3 3 0 004.2 4.2" />
                    <path d="M6.7 6.7C5 8 3.8 9.6 3 12c2 5 7 8 9 8 1.3 0 2.7-.4 4-1" />
                    <path d="M17.3 17.3C19 16 20.2 14.4 21 12c-2-5-7-8-9-8-.7 0-1.4.1-2 .3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="absolute right-6 top-5 text-xl font-semibold tracking-wide">
              SolCard
            </div>

            <div className="absolute left-6 top-16 h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500/60 to-cyan-400/60 border border-white/10" />

            {/* ✅ PAN: blurred unless revealed */}
            <div className="absolute left-6 top-[108px] flex items-center gap-4">
              <div className="flex items-center gap-3 text-sm tracking-widest">
                <span
                  className={
                    revealed ? "opacity-90" : "blur-[6px] opacity-75 select-none"
                  }
                >
                  {g1}
                </span>
                <span
                  className={
                    revealed ? "opacity-90" : "blur-[6px] opacity-75 select-none"
                  }
                >
                  {g2}
                </span>
                <span
                  className={
                    revealed ? "opacity-90" : "blur-[6px] opacity-75 select-none"
                  }
                >
                  {g3}
                </span>
              </div>

              <div className="text-3xl font-semibold tracking-wider">{g4}</div>
            </div>

            <div className="absolute left-6 bottom-6 grid grid-cols-2 gap-10">
              <div>
                <div className="text-xs opacity-60">Card Holder</div>
                <div className="text-base font-semibold">{card.holder}</div>
              </div>

              <div>
                <div className="text-xs opacity-60">Expires</div>
                <div className="text-base font-semibold">{card.expires}</div>
              </div>
            </div>

            {/* ✅ CVV blurred */}
            <div className="absolute right-24 bottom-8 text-xs opacity-70">
              CVV{" "}
              <span
                className={
                  revealed ? "opacity-85" : "blur-[6px] opacity-75 select-none"
                }
              >
                {cvv}
              </span>
            </div>

            {/* mastercard */}
            <div className="absolute right-6 bottom-6">
              <div className="relative h-8 w-14">
                <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-red-500/90" />
                <div className="absolute left-4 top-0 h-8 w-8 rounded-full bg-yellow-400/90 mix-blend-screen" />
              </div>
            </div>
          </div>

          <button
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Next card"
          >
            →
          </button>
        </div>

        {/* usage bar */}
        <div className="mt-8 max-w-[820px] mx-auto">
          <div className="flex items-center justify-between text-sm opacity-85 mb-2">
            <div>{pct}% of your monthly deposit limit used</div>
            <div>
              {formatMoney(card.depositUsed, "USD")} /{" "}
              {formatMoney(card.depositLimit, "USD")}
            </div>
          </div>

          <div className="h-[6px] rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-white/70"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        {/* tabs */}
        <div className="mt-6 max-w-[920px] mx-auto">
          <CardTabs cardId={card.id} />
        </div>
      </div>

      {/* ✅ Deposit modal: FULL (no transparent overlay), fee dropdown, QR above address */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* NO overlay so we don't see background through a dark veil */}
          <div className="relative w-full max-w-[580px]">
            <div className="rounded-2xl border border-white/10 bg-[#0f1115] shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Deposit</div>
                  <div className="text-sm opacity-70 mt-1">
                    Issuance fee{" "}
                    <span className="opacity-70">(mock)</span>
                  </div>
                </div>

                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
                  onClick={closeDeposit}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                {/* fee dropdown */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-2">Fee</div>
                  <select
                    value={feeEur}
                    onChange={(e) =>
                      setFeeEur(Number(e.target.value) as (typeof FEE_OPTIONS)[number])
                    }
                    className="h-11 w-full rounded-lg bg-black/30 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
                  >
                    {FEE_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        €{f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* amount choice */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-2">Amount</div>
                  <div className="flex items-center gap-2">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      className="h-11 w-full rounded-lg bg-black/30 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
                    />
                    <div className="h-11 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center text-sm opacity-80">
                      USD
                    </div>
                  </div>
                </div>

                {/* QR + address */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-3">
                    Deposit address (Solana)
                  </div>

                  {qrUrl && (
                    <div className="w-full flex justify-center mb-3">
                      <img
                        src={qrUrl}
                        alt="Solana deposit QR"
                        className="h-[220px] w-[220px] rounded-xl bg-white p-2"
                      />
                    </div>
                  )}

                  <div className="font-mono text-sm break-all">{solAddress}</div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5"
                    onClick={closeDeposit}
                  >
                    Cancel
                  </button>

                  <button
                    className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95 disabled:opacity-50"
                    onClick={confirmDeposit}
                    disabled={loading}
                  >
                    {loading ? "Confirming..." : "Confirm"}
                  </button>
                </div>

                <div className="text-xs opacity-55 pt-1">
                  Fee selection is stored on the card only if you choose to persist it later
                  (issuanceFeeEur). Deposit updates balance + adds a TopUp row with current date/time.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DottedBackground>
  );
}
