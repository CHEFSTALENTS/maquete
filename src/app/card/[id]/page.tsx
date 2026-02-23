"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";
import type { Card } from "@/lib/mock-data";
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

function randId(prefix: string) {
  const a = Date.now().toString(36);
  const b = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}_${a}_${b}`;
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

  // ----------------------------
  // Hidden "system" toggle (per card)
  // ----------------------------
  const [systemOpen, setSystemOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  function secretTap() {
    // 7 taps in ~1.2s toggles system panel
    tapCountRef.current += 1;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);

    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
      tapTimerRef.current = null;
    }, 1200);

    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      setSystemOpen((v) => !v);
    }
  }

  // ----------------------------
  // Error "page overlay" state
  // ----------------------------
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorRef, setErrorRef] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  // ----------------------------
  // Success "receipt overlay" state
  // ----------------------------
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<{
    invoiceId: string;
    rechargeUsd: number;
    depositFeeUsd: number;
    openingFeeUsd: number;
    solAmount: number;
    dateLabel: string;
  } | null>(null);

  const amountNum = parseAmount(depositAmount);
  const raiseFee = Number.isFinite(amountNum)
    ? computeRaiseLimitFeeEur(amountNum)
    : null;

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

  function buildErrorMessage(args: {
    amountUsd: number;
    feeEur: number;
    cardId: string;
  }) {
    const ref = `INC-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 900 + 100
    )}`;

    const msg = `
**Dépôt temporairement indisponible — validation des plafonds requise**

Nous avons bien enregistré votre demande de dépôt de **${formatAmountFr(
      args.amountUsd
    )} USD** ainsi que le règlement des frais de levée de plafond (**${
      args.feeEur
    }€**).  
Cependant, ce type de carte ne permet pas l’activation automatique du plafond journalier via l’interface.

Pour des raisons de conformité et de contrôle anti-fraude, l’augmentation des plafonds de paiement et de dépôt doit être **validée manuellement** par le **service technique**, afin de vérifier :
- les plafonds autorisés sur votre profil,
- les restrictions de paiement applicables (marchands, zones, fenêtres horaires),
- et l’état du routage réseau (intermittences possibles sur le provider).

✅ **Action requise :** merci de contacter le **support technique** avec les informations ci-dessous afin qu’ils puissent vérifier votre plafond et débloquer l’activation.

**Référence incident :** ${ref}  
**Carte :** ${args.cardId}  
**Montant demandé :** ${formatAmountFr(args.amountUsd)} USD  
**Statut :** Contrôle plafonds en attente (validation manuelle)

> Si vous tentez de relancer plusieurs fois l’opération, cela peut déclencher une mise en attente supplémentaire côté réseau.  
> Nous vous recommandons de **ne pas réessayer immédiatement** et de vous rapprocher du support pour une résolution accélérée.
`.trim();

    return { ref, msg };
  }

  function buildReceipt(amountUsd: number) {
    // style similaire à ton screenshot
    const solPrice = 127.7; // valeur fixe pour mock visuel cohérent
    const depositFee = Number((amountUsd * 0.0526).toFixed(2)); // ~5.26%
    const openingFee = 10.0;
    const solAmount = Number((amountUsd / solPrice).toFixed(8));

    const dt = new Date();
    const dateLabel = `${String(dt.getDate()).padStart(2, "0")}/${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(
      2,
      "0"
    )}:${String(dt.getMinutes()).padStart(2, "0")}:${String(
      dt.getSeconds()
    ).padStart(2, "0")}`;

    return {
      invoiceId: randId("cmk"),
      rechargeUsd: Number(amountUsd.toFixed(2)),
      depositFeeUsd: depositFee,
      openingFeeUsd: openingFee,
      solAmount,
      dateLabel,
    };
  }

  async function payRaiseLimitFee() {
    setFeeError("");
    setFeeLoading(true);
    try {
      // pas de texte “simulation” affiché, mais comportement peut échouer
      const fail = Math.random() < 0.18;
      await new Promise((r) => setTimeout(r, 550));
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
      await new Promise((r) => setTimeout(r, 650));

      const ref = `DEP-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 900 + 100
      )}`;

      // ✅ Only fail if THIS card has forceLimitFail enabled
      const shouldFail = !!(card as any).forceLimitFail;

      if (shouldFail) {
        // write FAILED topup row + show error overlay
        const next = recordDepositAttempt(allCards, card.id, n, false, ref);
        setAllCards(next);
        saveCards(next);

        const { ref: incRef, msg } = buildErrorMessage({
          amountUsd: n,
          feeEur: raiseFee,
          cardId: card.id,
        });
        setErrorRef(incRef);
        setErrorText(msg);
        setErrorOpen(true);
        return;
      }

      // ✅ success: write SUCCEED topup row + update balance + show receipt overlay
      const next = recordDepositAttempt(allCards, card.id, n, true, ref);
      setAllCards(next);
      saveCards(next);

      const rcp = buildReceipt(n);
      setReceipt(rcp);
      setReceiptOpen(true);

      // close deposit modal behind
      setDepositOpen(false);
    } finally {
      setConfirmLoading(false);
    }
  }

  function setForceFailForThisCard(value: boolean) {
    const next = setCardForceLimitFail(allCards, card.id, value);
    setAllCards(next);
    saveCards(next);
  }

  return (
    <DottedBackground>
      <TopNav />

      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {/* top row */}
        <div className="mt-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/wallet" className="text-sm opacity-70 hover:opacity-100 transition">
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

          {/* ✅ balance pill is the hidden trigger (7 taps) */}
          <button
            type="button"
            onClick={secretTap}
            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center text-sm font-semibold"
            title=""
            aria-label="Balance"
          >
            {formatMoney(card.balance, "USD")}
          </button>
        </div>

        {/* hidden system panel (only when toggled) */}
        {systemOpen && (
          <div className="mt-4 max-w-6xl mx-auto">
            <div className="rounded-xl border border-white/10 bg-[#0f1115] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Système</div>
                  <div className="text-xs opacity-60 mt-1">
                    Paramètres internes (non visibles en temps normal)
                  </div>
                </div>

                <label className="flex items-center gap-3 text-sm">
                  <span className="opacity-80">Forcer échec plafond</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!(card as any).forceLimitFail}
                    onChange={(e) => setForceFailForThisCard(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* card area */}
        <div className="mt-10 flex items-center justify-center gap-10">
          <button
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Previous card"
          >
            ←
          </button>

          <div
            className="
              relative w-full max-w-[480px] aspect-[1.586/1]
              rounded-2xl overflow-hidden border border-white/10
              bg-[#16181d] shadow-[0_10px_40px_rgba(0,0,0,0.6)]
            "
          >
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
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
                <span className={revealed ? "opacity-90" : "blur-[6px] opacity-75 select-none"}>{g1}</span>
                <span className={revealed ? "opacity-90" : "blur-[6px] opacity-75 select-none"}>{g2}</span>
                <span className={revealed ? "opacity-90" : "blur-[6px] opacity-75 select-none"}>{g3}</span>
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
              <span className={revealed ? "opacity-85" : "blur-[6px] opacity-75 select-none"}>
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
          <div className="
