"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";
import type { Card, Transaction } from "@/lib/mock-data";
import {
  loadCards,
  saveCards,
  recordDepositAttempt,
  setCardForceLimitFail,
} from "@/lib/cards-store";

function splitPan(pan: string) {
  const parts = pan.trim().split(/\s+/);
  return {
    g1: parts[0] ?? "0000",
    g2: parts[1] ?? "0000",
    g3: parts[2] ?? "0000",
    g4: parts[3] ?? "0000",
  };
}

function parseAmount(s: string) {
  const n = Number(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

function computeRaiseLimitFeeEur(depositAmount: number): number | null {
  if (depositAmount >= 2500 && depositAmount <= 4900) return 100;
  if (depositAmount >= 5000 && depositAmount <= 9600) return 200;
  if (depositAmount >= 10000) return 300;
  return null;
}

function formatAmountFr(n: number) {
  try {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function makeIncidentRef(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(
    Math.random() * 900 + 100
  )}`;
}

function nowIso() {
  return new Date().toISOString();
}

function txId(prefix = "t") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

// ---------- Confirmation page helpers (like screenshot) ----------
function moneyUs(n: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function fakeSolFromUsd(usd: number) {
  // mock rate to look real (no API)
  const rate = 127.6; // 1 SOL ≈ 127.6 USD
  const sol = usd / rate;
  return sol.toFixed(8);
}

function invoiceIdFromRef(ref: string) {
  const base = String(ref || "ref").replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `cmk${base.slice(-8)}${Date.now().toString(36)}${Math.floor(
    Math.random() * 9999
  ).toString(36)}`;
}

// ✅ helper transfert (inline, sans dépendre d’un autre fichier)
function transferFromMasterLocal(args: {
  cards: Card[];
  masterId: string;
  toId: string;
  amount: number;
}): { next: Card[]; ref: string; error?: string } {
  const { cards, masterId, toId } = args;
  const amt = Number(args.amount);

  if (!Number.isFinite(amt) || amt <= 0) {
    return { next: cards, ref: "", error: "Montant invalide." };
  }
  if (masterId === toId) {
    return { next: cards, ref: "", error: "Sélectionnez une carte différente." };
  }

  const master = cards.find((c) => c.id === masterId);
  const dest = cards.find((c) => c.id === toId);
  if (!master || !dest) {
    return { next: cards, ref: "", error: "Carte introuvable." };
  }
  if ((master.balance ?? 0) < amt) {
    return {
      next: cards,
      ref: "",
      error: "Solde insuffisant sur la carte principale.",
    };
  }

  const ref = makeIncidentRef("TRF");
  const when = nowIso();

  const masterTx: Transaction = {
    id: txId("t"),
    type: "Auth",
    status: "Succeed",
    description: `Transfer to •••• ${dest.ending}`,
    amount: Number(amt.toFixed(2)),
    date: when,
    meta: { ref, note: `To ${dest.holder}` },
  };

  const destTx: Transaction = {
    id: txId("t"),
    type: "Auth",
    status: "Succeed",
    description: `Transfer from •••• ${master.ending}`,
    amount: Number(amt.toFixed(2)),
    date: when,
    meta: { ref, note: `From ${master.holder}` },
  };

  const next = cards.map((c) => {
    if (c.id === masterId) {
      return {
        ...c,
        balance: Number(((c.balance ?? 0) - amt).toFixed(2)),
        transactions: [masterTx, ...(c.transactions ?? [])],
      };
    }
    if (c.id === toId) {
      return {
        ...c,
        balance: Number(((c.balance ?? 0) + amt).toFixed(2)),
        transactions: [destTx, ...(c.transactions ?? [])],
      };
    }
    return c;
  });

  return { next, ref };
}

export default function CardPage() {
  const params = useParams<{ id: string }>();

  const [allCards, setAllCards] = useState<Card[]>(() => loadCards());
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setAllCards(loadCards());
  }, []);

  const card = useMemo(() => {
    const id = params?.id;
    return allCards.find((c) => c.id === id) ?? allCards[0];
  }, [allCards, params?.id]);

  const pct = Math.round((card.depositUsed / card.depositLimit) * 100);

  const pan = (card as any).pan ?? `0000 0000 0000 ${card.ending}`;
  const cvv = (card as any).cvv ?? "123";
  const { g1, g2, g3, g4 } = splitPan(pan);

  // ----------------------------
  // Deposit modal state
  // ----------------------------
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("2500");

  const [feePaid, setFeePaid] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string>("");

  const [confirmLoading, setConfirmLoading] = useState(false);

  // per-card toggle local (HIDDEN)
  const [forceFailLocal, setForceFailLocal] = useState<boolean>(
    !!(card as any).forceLimitFail
  );

  useEffect(() => {
    setForceFailLocal(!!(card as any).forceLimitFail);
  }, [card?.id]);

  const amountNum = parseAmount(depositAmount);
  const raiseFee = Number.isFinite(amountNum)
    ? computeRaiseLimitFeeEur(amountNum)
    : null;

  // ----------------------------
  // Overlay (Success / Error) - unified design
  // ----------------------------
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayKind, setOverlayKind] = useState<"success" | "error">("success");
  const [overlayRef, setOverlayRef] = useState("");
  const [overlayAmount, setOverlayAmount] = useState(0);
  const [overlayDate, setOverlayDate] = useState("");
  const [overlayNote, setOverlayNote] = useState("");
  const [overlayContext, setOverlayContext] = useState<
    "deposit" | "transfer"
  >("deposit");

  // listen to clickable topups from TransactionsTable
  useEffect(() => {
    function onOpen(e: any) {
      const d = e?.detail;
      if (!d?.ref) return;

      const isFailed = String(d.status).toLowerCase() === "failed";

      setOverlayKind(isFailed ? "error" : "success");
      setOverlayRef(String(d.ref));
      setOverlayAmount(Number(d.amount ?? 0));
      setOverlayDate(String(d.date ?? ""));
      setOverlayNote(String(d.note ?? ""));
      setOverlayContext("deposit"); // topups table -> deposit context
      setOverlayOpen(true);
    }

    window.addEventListener("solcard:topup:open", onOpen as any);
    return () =>
      window.removeEventListener("solcard:topup:open", onOpen as any);
  }, []);

  function openDeposit() {
    setDepositOpen(true);
    setDepositAmount("2500");
    setFeePaid(false);
    setFeeLoading(false);
    setFeeError("");
    setConfirmLoading(false);
  }

  function closeDeposit() {
    setDepositOpen(false);
  }

  async function payRaiseLimitFee() {
    setFeeError("");
    setFeeLoading(true);
    try {
      const fail = Math.random() < 0.15;
      await new Promise((r) => setTimeout(r, 520));
      if (fail) {
        setFeePaid(false);
        setFeeError("Erreur réseau lors du paiement. Veuillez réessayer.");
        return;
      }
      setFeePaid(true);
    } finally {
      setFeeLoading(false);
    }
  }

  async function confirmDeposit() {
    const n = parseAmount(depositAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!raiseFee || !feePaid) return;

    setConfirmLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 550));

      const ref = makeIncidentRef("INC");
      const ok = !(card as any).forceLimitFail; // ✅ per-card control

      const next = recordDepositAttempt(allCards, card.id, n, ok, ref);
      setAllCards(next);
      saveCards(next);

      setDepositOpen(false);

      setOverlayContext("deposit");
      setOverlayKind(ok ? "success" : "error");
      setOverlayRef(ref);
      setOverlayAmount(n);
      setOverlayDate(new Date().toISOString());
      setOverlayNote(ok ? "Deposit confirmed" : "Limit validation required");
      setOverlayOpen(true);
    } finally {
      setConfirmLoading(false);
    }
  }

  function onToggleFailForThisCard(v: boolean) {
    setForceFailLocal(v);
    const next = setCardForceLimitFail(allCards, card.id, v);
    setAllCards(next);
    saveCards(next);
  }

  // ----------------------------
  // ✅ TRANSFER (Master -> any card)
  // ----------------------------
  const MASTER_ID = "solcard-2";
  const masterCard = useMemo(() => {
    return allCards.find((c) => c.id === MASTER_ID) ?? allCards[0];
  }, [allCards]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferToId, setTransferToId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("500");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string>("");

  const transferTargets = useMemo(() => {
    // all cards except master
    return allCards.filter((c) => c.id !== masterCard?.id);
  }, [allCards, masterCard?.id]);

  function openTransfer() {
    setTransferOpen(true);
    setTransferAmount("500");
    setTransferError("");

    const preferred =
      card.id !== masterCard?.id ? card.id : transferTargets[0]?.id ?? "";
    setTransferToId(preferred);
  }

  function closeTransfer() {
    setTransferOpen(false);
  }

  async function confirmTransfer() {
    const n = parseAmount(transferAmount);
    if (!Number.isFinite(n) || n <= 0) {
      setTransferError("Entrez un montant valide.");
      return;
    }
    if (!transferToId) {
      setTransferError("Sélectionnez une carte destination.");
      return;
    }

    setTransferLoading(true);
    setTransferError("");
    try {
      await new Promise((r) => setTimeout(r, 450));

      const { next, ref, error } = transferFromMasterLocal({
        cards: allCards,
        masterId: masterCard.id,
        toId: transferToId,
        amount: n,
      });

      if (error) {
        setTransferError(error);
        return;
      }

      setAllCards(next);
      saveCards(next);
      setTransferOpen(false);

      const dest = allCards.find((c) => c.id === transferToId);

      setOverlayContext("transfer");
      setOverlayKind("success");
      setOverlayRef(ref || makeIncidentRef("TRF"));
      setOverlayAmount(n);
      setOverlayDate(new Date().toISOString());
      setOverlayNote(
        `Transfer completed from •••• ${masterCard.ending} to •••• ${
          dest?.ending ?? "----"
        }`
      );
      setOverlayOpen(true);
    } finally {
      setTransferLoading(false);
    }
  }

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

            <button
              onClick={openTransfer}
              className="h-10 px-5 rounded-lg bg-white/0 border border-white/15 text-sm opacity-90 hover:bg-white/5 transition"
            >
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

          <div className="relative w-full max-w-[480px] aspect-[1.586/1] rounded-2xl overflow-hidden border border-white/10 bg-[#16181d] shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/40" />

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

            <div className="absolute left-6 top-[108px] flex items-center gap-4">
              <div className="flex items-center gap-3 text-sm tracking-widest">
                <span
                  className={
                    revealed
                      ? "opacity-90"
                      : "blur-[6px] opacity-75 select-none"
                  }
                >
                  {g1}
                </span>
                <span
                  className={
                    revealed
                      ? "opacity-90"
                      : "blur-[6px] opacity-75 select-none"
                  }
                >
                  {g2}
                </span>
                <span
                  className={
                    revealed
                      ? "opacity-90"
                      : "blur-[6px] opacity-75 select-none"
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

            <div className="absolute right-24 bottom-8 text-xs opacity-70">
              CVV{" "}
              <span
                className={
                  revealed
                    ? "opacity-85"
                    : "blur-[6px] opacity-75 select-none"
                }
              >
                {cvv}
              </span>
            </div>

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

      {/* ---------------------- */}
      {/* ✅ TRANSFER MODAL */}
      {/* ---------------------- */}
      {transferOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/95"
            onClick={closeTransfer}
          />
          <div className="relative w-full max-w-[620px]">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Transfer</div>
                  <div className="text-sm opacity-70 mt-1">
                    Source :{" "}
                    <span className="font-semibold">
                      Main account •••• {masterCard.ending}
                    </span>
                  </div>
                </div>
                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
                  onClick={closeTransfer}
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-2">Destination</div>
                  <select
                    className="h-11 w-full rounded-lg bg-black/40 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                  >
                    {transferTargets.length === 0 ? (
                      <option value="">No target cards</option>
                    ) : (
                      transferTargets.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.holder} •••• {c.ending}
                        </option>
                      ))
                    )}
                  </select>

                  <div className="mt-2 text-xs text-white/50">
                    Solde main account :{" "}
                    <span className="text-white/80 font-medium">
                      {formatMoney(masterCard.balance ?? 0, "USD")}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-2">Amount</div>
                  <div className="flex items-center gap-2">
                    <input
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      inputMode="decimal"
                      className="h-11 w-full rounded-lg bg-black/40 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
                    />
                    <div className="h-11 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center text-sm opacity-80">
                      USD
                    </div>
                  </div>
                  {transferError ? (
                    <div className="mt-3 text-sm text-rose-200/90">
                      {transferError}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5"
                    onClick={closeTransfer}
                    disabled={transferLoading}
                  >
                    Cancel
                  </button>

                  <button
                    className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95 disabled:opacity-50"
                    onClick={confirmTransfer}
                    disabled={transferLoading || !transferToId}
                  >
                    {transferLoading ? "Processing..." : "Confirm transfer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* ✅ DEPOSIT MODAL */}
      {/* ---------------------- */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/95" onClick={closeDeposit} />

          <div className="relative w-full max-w-[620px]">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Deposit</div>
                  <div className="text-sm opacity-70 mt-1">
                    Pour déposer, vous devez lever le plafond (validation
                    manuelle).
                  </div>
                </div>
                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
                  onClick={closeDeposit}
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70 mb-2">Montant</div>
                  <div className="flex items-center gap-2">
                    <input
                      value={depositAmount}
                      onChange={(e) => {
                        setDepositAmount(e.target.value);
                        setFeePaid(false);
                        setFeeError("");
                      }}
                      inputMode="decimal"
                      className="h-11 w-full rounded-lg bg-black/40 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
                    />
                    <div className="h-11 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center text-sm opacity-80">
                      USD
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-white/60 leading-5">
                    Barème des frais :
                    <div>• 100€ pour 2 500 → 4 900</div>
                    <div>• 200€ pour 5 000 → 9 600</div>
                    <div>• 300€ pour 10 000+</div>
                  </div>
                </div>

                {/* HIDDEN toggle for limit failure (per card) */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/35">
                      {/* intentionally blank / hidden */}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFailForThisCard(!forceFailLocal)}
                      className={
                        forceFailLocal
                          ? "h-9 px-3 rounded-lg bg-rose-200 text-black text-sm font-medium opacity-0 pointer-events-auto"
                          : "h-9 px-3 rounded-lg bg-white/10 border border-white/10 text-sm opacity-0 pointer-events-auto"
                      }
                      aria-label="(hidden) Toggle limit failure"
                      title="(interne) Toggle échec plafond"
                    >
                      {forceFailLocal ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">
                    Frais de levée de plafond
                  </div>

                  {!Number.isFinite(amountNum) ? (
                    <div className="mt-1 text-sm text-white/60">
                      Entrez un montant valide.
                    </div>
                  ) : raiseFee === null ? (
                    <div className="mt-1 text-sm text-rose-200/90">
                      Montant non éligible (choisissez un palier valide).
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-2xl font-semibold">€{raiseFee}</div>
                      <div className="text-sm opacity-70">
                        {feePaid ? "Payé ✅" : "Non payé"}
                      </div>
                    </div>
                  )}

                  {feeError ? (
                    <div className="mt-3 text-sm text-rose-200/90">
                      {feeError}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-end gap-3">
                    {!feePaid ? (
                      <button
                        className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95 disabled:opacity-50"
                        onClick={payRaiseLimitFee}
                        disabled={
                          feeLoading ||
                          raiseFee === null ||
                          !Number.isFinite(amountNum)
                        }
                      >
                        {feeLoading ? "Traitement..." : "Payer les frais"}
                      </button>
                    ) : (
                      <button
                        className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95 disabled:opacity-50"
                        onClick={confirmDeposit}
                        disabled={confirmLoading || raiseFee === null}
                      >
                        {confirmLoading ? "Vérification..." : "Confirmer"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-white/45"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* ✅ CONFIRMATION OVERLAY (same design as screenshot) */}
      {/* ---------------------- */}
      {overlayOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/90"
            onClick={() => setOverlayOpen(false)}
          />

          {/* narrower to match mobile look */}
          <div className="relative w-full max-w-[620px]">
            {/* toast (only on success, like screenshot) */}
            {overlayKind === "success" && (
              <div className="absolute -top-16 left-0 right-0 mx-auto w-full max-w-[620px]">
                <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_20px_70px_rgba(0,0,0,0.75)] px-5 py-4">
                  <div className="text-sm font-semibold">Success</div>
                  <div className="text-sm text-white/70 mt-1">
                    Payment received.
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] overflow-hidden">
              <div className="relative px-6 pt-8 pb-6">
                {/* simple confetti (success only) */}
                <style jsx>{`
                  @keyframes fall {
                    0% {
                      transform: translateY(-40px) rotate(0deg);
                      opacity: 0;
                    }
                    10% {
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(420px) rotate(360deg);
                      opacity: 0;
                    }
                  }
                  .confetti {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 0;
                    pointer-events: none;
                  }
                  .confetti span {
                    position: absolute;
                    width: 10px;
                    height: 6px;
                    border-radius: 2px;
                    opacity: 0.9;
                    animation: fall 1.8s linear infinite;
                  }
                `}</style>

                {overlayKind === "success" && (
                  <div className="confetti">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          left: `${(i * 100) / 18}%`,
                          background:
                            i % 3 === 0
                              ? "#22c55e"
                              : i % 3 === 1
                              ? "#60a5fa"
                              : "#f59e0b",
                          animationDelay: `${(i % 6) * 0.12}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* top right close */}
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold text-white/80">
                    {overlayKind === "success"
                      ? "Payment Succeeded!"
                      : "Payment Failed"}
                  </div>

                  <button
                    className="h-9 w-9 rounded-xl border border-white/10 hover:bg-white/5 flex items-center justify-center"
                    onClick={() => setOverlayOpen(false)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                {overlayKind === "success" ? (
                  <>
                    {/* big check */}
                    <div className="mt-8 flex justify-center">
                      <div className="h-28 w-28 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_25px_60px_rgba(16,185,129,0.25)]">
                        <svg
                          width="54"
                          height="54"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    </div>

                    {/* title */}
                    <div className="mt-8 text-center">
                      <div className="text-3xl font-semibold leading-tight">
                        {overlayContext === "transfer"
                          ? "Your transfer has been completed successfully."
                          : "Your card has been recharged successfully."}
                      </div>

                      <div className="mt-4 text-white/50">
                        Invoice ID:{" "}
                        <span className="text-white/70 font-mono">
                          {invoiceIdFromRef(overlayRef)}
                        </span>
                      </div>
                    </div>

                    {/* divider */}
                    <div className="mt-8 h-px bg-white/10" />

                    {/* table */}
                    <div className="mt-6 grid grid-cols-2 gap-y-4 text-white/70">
                      <div className="text-sm">Card Recharge Amount</div>
                      <div className="text-sm text-right text-white/90 font-semibold">
                        ${moneyUs(overlayAmount)}
                      </div>

                      <div className="text-sm">
                        {overlayContext === "transfer"
                          ? "Transfer Fee"
                          : "Deposit Fee"}
                      </div>
                      <div className="text-sm text-right text-white/90 font-semibold">
                        ${moneyUs(0)}
                      </div>

                      <div className="text-sm">Card Opening Fee</div>
                      <div className="text-sm text-right text-white/90 font-semibold">
                        ${moneyUs(10)}
                      </div>

                      <div className="text-sm">
                        {overlayContext === "transfer"
                          ? "Transfer Amount"
                          : "Deposit Amount"}
                      </div>
                      <div className="text-sm text-right text-white/90 font-semibold">
                        {fakeSolFromUsd(overlayAmount)} SOL
                      </div>

                      <div className="text-sm">Invoice Date</div>
                      <div className="text-sm text-right text-white/90 font-semibold">
                        {overlayDate
                          ? new Date(overlayDate).toLocaleString("en-GB")
                          : "—"}
                      </div>
                    </div>

                    {/* button */}
                    <div className="mt-8">
                      <button
                        className="w-full h-12 rounded-2xl bg-white text-black font-medium hover:opacity-95 transition"
                        onClick={() => setOverlayOpen(false)}
                      >
                        View your SolCard
                      </button>
                    </div>

                    <div className="mt-4 text-center text-xs text-white/35">
                      {overlayRef ? `Ref: ${overlayRef}` : ""}
                      {overlayNote ? ` • ${overlayNote}` : ""}
                    </div>
                  </>
                ) : (
                  <>
                    {/* ERROR: keep long french message */}
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 leading-6 whitespace-pre-line">
                      {(() => {
                        const fee = computeRaiseLimitFeeEur(overlayAmount) ?? 0;
                        return [
                          `Dépôt temporairement indisponible — validation des plafonds requise`,
                          ``,
                          `Nous avons bien enregistré votre demande de dépôt de ${formatAmountFr(
                            overlayAmount
                          )} USD ainsi que le règlement des frais de levée de plafond (${fee}€).`,
                          ``,
                          `Cependant, sur ce type de carte, le plafond journalier n’est pas activable automatiquement via l’interface.`,
                          `L’augmentation effective des plafonds de paiement/dépôt doit être validée manuellement par le service technique.`,
                          ``,
                          `Référence incident : ${overlayRef}`,
                          `Carte : ${card.id}`,
                          `Montant demandé : ${formatAmountFr(
                            overlayAmount
                          )} USD`,
                          ``,
                          `Merci de vous rapprocher du support technique pour vérification des plafonds autorisés.`,
                        ].join("\n");
                      })()}
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-3">
                      <button
                        className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5"
                        onClick={() => setOverlayOpen(false)}
                      >
                        Fermer
                      </button>
                      <button
                        className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95"
                        onClick={() => setOverlayOpen(false)}
                      >
                        OK
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DottedBackground>
  );
}
