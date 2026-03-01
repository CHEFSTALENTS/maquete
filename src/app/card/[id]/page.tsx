"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";
import {
  loadCards,
  saveCards,
  recordDepositAttempt,
  setCardForceLimitFail,
  addFakeTransactionToCard,
} from "@/lib/cards-store";
import type { Card, Transaction } from "@/lib/mock-data";


/* ------------------ helpers ------------------ */

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

function nowIso() {
  return new Date().toISOString();
}

function makeRef(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(
    Math.random() * 900 + 100
  )}`;
}

function txId(prefix = "t") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function makeInvoiceId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 26; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `cmk${out}`;
}

// faux conversion USD -> SOL (juste pour l’affichage)
function usdToSol(usd: number) {
  const rate = 127.8; // 1 SOL = 127.8 USD (mock)
  const sol = usd / rate;
  return Number(sol.toFixed(9));
}

/**
 * ✅ helper transfert (inline)
 * Transfert depuis une carte "master" (compte principal) vers une carte cible
 * - débite master.balance
 * - crédite dest.balance
 * - ajoute 1 transaction sur chaque carte
 */
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
    return { next: cards, ref: "", error: "Solde insuffisant sur le compte principal." };
  }

  const ref = makeRef("TRF");
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

/* ------------------ page ------------------ */

export default function CardPage() {
  const params = useParams<{ id: string }>();
// ordre stable des cartes (comme dans le dashboard/localStorage)
const cardIds = useMemo(() => allCards.map((c) => c.id), [allCards]);

const currentIndex = useMemo(() => {
  const id = params?.id;
  const idx = id ? cardIds.indexOf(id) : 0;
  return idx >= 0 ? idx : 0;
}, [params?.id, cardIds]);

function goToCardIndex(nextIdx: number) {
  if (!cardIds.length) return;
  const wrapped = (nextIdx + cardIds.length) % cardIds.length; // boucle
  const nextId = cardIds[wrapped];
  if (!nextId) return;
  window.location.href = `/card/${nextId}`; // simple + fiable côté client
}
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

  /* ------------------ Deposit modal ------------------ */

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("2500");

  const [feePaid, setFeePaid] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string>("");

  const [confirmLoading, setConfirmLoading] = useState(false);

  const amountNum = parseAmount(depositAmount);
  const raiseFee = Number.isFinite(amountNum)
    ? computeRaiseLimitFeeEur(amountNum)
    : null;
// ✅ Hidden "fake tx" tool
const [txOpen, setTxOpen] = useState(false);
const [txDesc, setTxDesc] = useState("DELIVEROO PARIS FR");
const [txAmount, setTxAmount] = useState("18.90");
const [txStatus, setTxStatus] = useState<"Succeed" | "Failed">("Succeed");

// mini trigger caché: 5 taps sur le solde
const [secretTaps, setSecretTaps] = useState(0);
useEffect(() => {
  if (secretTaps >= 5) {
    setSecretTaps(0);
    setTxOpen(true);
  }
}, [secretTaps]);

function addFakeTx() {
  const amt = parseAmount(txAmount);
  if (!Number.isFinite(amt)) return;

  const next = addFakeTransactionToCard(allCards, card.id, {
    description: txDesc,
    amount: amt,
    status: txStatus,
    type: "Auth",
  });

  setAllCards(next);
  saveCards(next);
  setTxOpen(false);
}
  // ✅ hidden toggle: 5 taps on the "Deposit" title
  const [forceFailLocal, setForceFailLocal] = useState<boolean>(!!card.forceLimitFail);
  const [showSecretToggle, setShowSecretToggle] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setForceFailLocal(!!card.forceLimitFail);
  }, [card?.id]);

  function openDeposit() {
    setDepositOpen(true);
    setDepositAmount("2500");
    setFeePaid(false);
    setFeeLoading(false);
    setFeeError("");
    setConfirmLoading(false);
    setShowSecretToggle(false);
    tapCountRef.current = 0;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = null;
  }

  function closeDeposit() {
    setDepositOpen(false);
  }

  function onDepositTitleTap() {
    tapCountRef.current += 1;

    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
      tapTimerRef.current = null;
    }, 700);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setShowSecretToggle((v) => !v);
    }
  }

  function onToggleFailForThisCard(v: boolean) {
    setForceFailLocal(v);
    const next = setCardForceLimitFail(allCards, card.id, v);
    setAllCards(next);
    saveCards(next);
  }

  async function payRaiseLimitFee() {
    setFeeError("");
    setFeeLoading(true);
    try {
      // petit aléa "erreur réseau" (si tu ne veux jamais d’échec ici, mets fail = false)
      const fail = Math.random() < 0.12;
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

  /* ------------------ Transfer flow (screenshots) ------------------ */

  // carte master (compte principal)
  const MASTER_ID = "solcard-2";
  const masterCard = useMemo(() => {
    return allCards.find((c) => c.id === MASTER_ID) ?? allCards[0];
  }, [allCards]);

  const transferTargets = useMemo(() => {
    return allCards.filter((c) => c.id !== masterCard.id);
  }, [allCards, masterCard.id]);

  type TransferSheet = null | "option" | "internal";
  const [transferSheet, setTransferSheet] = useState<TransferSheet>(null);

  const [transferToId, setTransferToId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("0.00");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string>("");

  function openTransfer() {
    setTransferSheet("option");
    setTransferError("");
    setTransferLoading(false);

    // destination par défaut
    const preferred = card.id !== masterCard.id ? card.id : transferTargets[0]?.id ?? "";
    setTransferToId(preferred);
    setTransferAmount("0.00");
  }

  function closeTransfer() {
    setTransferSheet(null);
  }

  function goTransferInternal() {
    setTransferSheet("internal");
    setTransferError("");
    // si vide, on garde un fallback
    if (!transferToId) {
      const preferred = card.id !== masterCard.id ? card.id : transferTargets[0]?.id ?? "";
      setTransferToId(preferred);
    }
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

      closeTransfer();

      // Confirmation overlay (même design que dépôt réussi)
      setConfirmOverlay({
        open: true,
        kind: "success",
        context: "transfer",
        titleTop: "Success",
        subtitleTop: "Payment received.",
        ref,
        invoiceId: makeInvoiceId(),
        amountUsd: n,
        feeUsd: Number((n * 0.05).toFixed(2)), // mock "withhold 5%"
        openingFeeUsd: 0,
        solAmount: usdToSol(n),
        dateIso: nowIso(),
        note: `Transfer •••• ${masterCard.ending} → •••• ${
          allCards.find((c) => c.id === transferToId)?.ending ?? "----"
        }`,
      });
    } finally {
      setTransferLoading(false);
    }
  }

  /* ------------------ Confirmation overlay (deposit/transfer + click rows) ------------------ */

  type ConfirmContext = "deposit" | "transfer";
  type ConfirmKind = "success" | "error";

  const [confirmOverlay, setConfirmOverlay] = useState<{
    open: boolean;
    kind: ConfirmKind;
    context: ConfirmContext;
    titleTop: string;
    subtitleTop: string;
    ref: string;
    invoiceId: string;
    amountUsd: number;
    feeUsd: number;
    openingFeeUsd: number;
    solAmount: number;
    dateIso: string;
    note?: string;
    longErrorText?: string;
  }>({
    open: false,
    kind: "success",
    context: "deposit",
    titleTop: "Success",
    subtitleTop: "Payment received.",
    ref: "",
    invoiceId: "",
    amountUsd: 0,
    feeUsd: 0,
    openingFeeUsd: 0,
    solAmount: 0,
    dateIso: "",
  });

  // Clickable rows (topups) -> open overlay
  useEffect(() => {
    function onOpen(e: any) {
      const d = e?.detail;
      if (!d?.ref) return;

      const isFailed = String(d.status).toLowerCase() === "failed";
      const amt = Number(d.amount ?? 0);
      const ref = String(d.ref);
      const dateIso = String(d.date ?? nowIso());
      const note = String(d.note ?? "");

      if (isFailed) {
        const feeEur = computeRaiseLimitFeeEur(amt) ?? 0;
        const longText = [
          "Dépôt temporairement indisponible — validation des plafonds requise",
          "",
          `Nous avons bien enregistré votre demande de dépôt de ${formatAmountFr(
            amt
          )} USD ainsi que le règlement des frais de levée de plafond (${feeEur}€).`,
          "",
          "Cependant, sur ce type de carte, le plafond journalier n’est pas activable automatiquement via l’interface.",
          "L’augmentation effective des plafonds de paiement/dépôt doit être validée manuellement par le service technique (conformité, anti-fraude, restrictions marchands, routage réseau).",
          "",
          "Action requise : merci de contacter le service technique afin qu’ils vérifient les plafonds autorisés et débloquent l’activation.",
          "",
          `Référence incident : ${ref}`,
          `Carte : ${card.id}`,
          `Montant demandé : ${formatAmountFr(amt)} USD`,
          "",
          "Conseil : évitez de relancer l’opération en boucle. Cela peut déclencher une mise en attente supplémentaire côté réseau/provider.",
        ].join("\n");

        setConfirmOverlay({
          open: true,
          kind: "error",
          context: "deposit",
          titleTop: "Error",
          subtitleTop: "Network / limit validation required.",
          ref,
          invoiceId: makeInvoiceId(),
          amountUsd: amt,
          feeUsd: 0,
          openingFeeUsd: 0,
          solAmount: usdToSol(amt),
          dateIso,
          note,
          longErrorText: longText,
        });
      } else {
        setConfirmOverlay({
          open: true,
          kind: "success",
          context: "deposit",
          titleTop: "Success",
          subtitleTop: "Payment received.",
          ref,
          invoiceId: makeInvoiceId(),
          amountUsd: amt,
          feeUsd: Number((amt * 0.0526).toFixed(2)),
          openingFeeUsd: 10,
          solAmount: usdToSol(amt),
          dateIso,
          note,
        });
      }
    }

    window.addEventListener("solcard:topup:open", onOpen as any);
    return () => window.removeEventListener("solcard:topup:open", onOpen as any);
  }, [card.id]);

  function closeConfirmOverlay() {
    setConfirmOverlay((s) => ({ ...s, open: false }));
  }

  /* ------------------ Deposit confirm ------------------ */

  async function confirmDeposit() {
    const n = parseAmount(depositAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!raiseFee || !feePaid) return;

    setConfirmLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 550));

      const ref = makeRef("INC");
      const ok = !card.forceLimitFail;

      const next = recordDepositAttempt(allCards, card.id, n, ok, ref);
      setAllCards(next);
      saveCards(next);

      setDepositOpen(false);

      if (ok) {
        setConfirmOverlay({
          open: true,
          kind: "success",
          context: "deposit",
          titleTop: "Success",
          subtitleTop: "Payment received.",
          ref,
          invoiceId: makeInvoiceId(),
          amountUsd: n,
          feeUsd: Number((n * 0.0526).toFixed(2)), // mock deposit fee
          openingFeeUsd: 10,
          solAmount: usdToSol(n),
          dateIso: nowIso(),
          note: "TopUp - Card Funding",
        });
      } else {
        const feeEur = computeRaiseLimitFeeEur(n) ?? 0;
        const longText = [
          "Dépôt temporairement indisponible — validation des plafonds requise",
          "",
          `Nous avons bien enregistré votre demande de dépôt de ${formatAmountFr(
            n
          )} USD ainsi que le règlement des frais de levée de plafond (${feeEur}€).`,
          "",
          "Cependant, sur ce type de carte, le plafond journalier n’est pas activable automatiquement via l’interface.",
          "L’augmentation effective des plafonds de paiement/dépôt doit être validée manuellement par le service technique (conformité, anti-fraude, restrictions marchands, routage réseau).",
          "",
          "Action requise : merci de contacter le service technique afin qu’ils vérifient les plafonds autorisés et débloquent l’activation.",
          "",
          `Référence incident : ${ref}`,
          `Carte : ${card.id}`,
          `Montant demandé : ${formatAmountFr(n)} USD`,
          "",
          "Conseil : évitez de relancer l’opération en boucle. Cela peut déclencher une mise en attente supplémentaire côté réseau/provider.",
        ].join("\n");

        setConfirmOverlay({
          open: true,
          kind: "error",
          context: "deposit",
          titleTop: "Error",
          subtitleTop: "Network / limit validation required.",
          ref,
          invoiceId: makeInvoiceId(),
          amountUsd: n,
          feeUsd: 0,
          openingFeeUsd: 0,
          solAmount: usdToSol(n),
          dateIso: nowIso(),
          note: "Limit validation required",
          longErrorText: longText,
        });
      }
    } finally {
      setConfirmLoading(false);
    }
  }

  /* ------------------ UI ------------------ */
const overlayContext = confirmOverlay?.context ?? "deposit";

const successTitle =
  overlayContext === "transfer" ? "Transfer received." : "Payment received.";

const successMessage =
  overlayContext === "transfer"
    ? "Your transfer has been processed successfully."
    : "Your card has been recharged successfully.";
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

         <button
  type="button"
  onClick={() => setSecretTaps((n) => n + 1)}
  className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center text-sm font-semibold"
  title=""
>
  {formatMoney(card.balance, "USD")}
</button>
        </div>

        {/* card area */}
        <div className="mt-10 flex items-center justify-center gap-10">
          <button
  onClick={() => goToCardIndex(currentIndex - 1)}
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
              <span className={revealed ? "opacity-85" : "blur-[6px] opacity-75 select-none"}>{cvv}</span>
            </div>

            <div className="absolute right-6 bottom-6">
              <div className="relative h-8 w-14">
                <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-red-500/90" />
                <div className="absolute left-4 top-0 h-8 w-8 rounded-full bg-yellow-400/90 mix-blend-screen" />
              </div>
            </div>
          </div>

          <button
  onClick={() => goToCardIndex(currentIndex + 1)}
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
{txOpen && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
    <div className="absolute inset-0 bg-black/95" onClick={() => setTxOpen(false)} />

    <div className="relative w-full max-w-[520px]">
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">Add transaction</div>
            <div className="text-xs text-white/55 mt-1">
              (outil interne) Ajoute une transaction factice sur cette carte uniquement.
            </div>
          </div>
          <button
            className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
            onClick={() => setTxOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70 mb-2">Description</div>
            <input
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
              className="h-11 w-full rounded-lg bg-black/40 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70 mb-2">Amount</div>
            <div className="flex items-center gap-2">
              <input
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                inputMode="decimal"
                className="h-11 w-full rounded-lg bg-black/40 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
              />
              <div className="h-11 px-3 rounded-lg bg-white/5 border border-white/10 flex items-center text-sm opacity-80">
                USD
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs opacity-70 mb-2">Status</div>
            <select
              value={txStatus}
              onChange={(e) => setTxStatus(e.target.value as any)}
              className="h-11 w-full rounded-lg bg-black/40 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
            >
              <option value="Succeed">Succeed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5"
              onClick={() => setTxOpen(false)}
            >
              Cancel
            </button>
            <button
              className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95"
              onClick={addFakeTx}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
        {/* tabs */}
        <div className="mt-6 max-w-[920px] mx-auto">
          <CardTabs cardId={card.id} />
        </div>
      </div>

      {/* ---------------------- */}
      {/* TRANSFER: Sheet 1 (Select an option) */}
      {/* ---------------------- */}
      {transferSheet === "option" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/80" onClick={closeTransfer} />
          <div className="relative w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-4">
            <div className="flex items-center justify-center">
              <div className="h-1.5 w-12 rounded-full bg-white/15" />
            </div>

            <div className="mt-4 text-center">
              <div className="text-xl font-semibold">Select an option</div>
              <div className="text-sm opacity-70 mt-1">
                Choose how you would like to proceed.
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                onClick={goTransferInternal}
                className="h-12 rounded-xl bg-white text-black text-sm font-semibold hover:opacity-95 transition"
              >
                Transfer funds to another SolCard
              </button>

              <div className="text-center text-xs opacity-60">or</div>

              <button
                onClick={() => {
                  // volontairement inactif (comme sur ta vidéo, tu peux l’implémenter plus tard)
                  setTransferError("Withdraw USDT (SOL) n’est pas disponible sur cette maquette.");
                }}
                className="h-12 rounded-xl border border-white/15 bg-white/0 text-sm font-semibold opacity-90 hover:bg-white/5 transition"
              >
                Withdraw funds to USDT (SOL)
              </button>

              {transferError ? (
                <div className="text-sm text-rose-200/90 mt-1">{transferError}</div>
              ) : null}

              <button
                onClick={closeTransfer}
                className="h-12 rounded-xl border border-white/15 bg-white/0 text-sm font-semibold opacity-90 hover:bg-white/5 transition mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* TRANSFER: Sheet 2 (Request Transfer) */}
      {/* ---------------------- */}
      {transferSheet === "internal" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/80" onClick={closeTransfer} />
          <div className="relative w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-4">
            <div className="flex items-center justify-center">
              <div className="h-1.5 w-12 rounded-full bg-white/15" />
            </div>

            <div className="mt-4 text-center text-sm text-white/70 leading-5">
              Request a transfer to your wallet. Minimum transfer is 5 USDT. A 5% withhold applies.
            </div>

            {/* Amount */}
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2">Amount</div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 h-12">
                <input
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  inputMode="decimal"
                  className="flex-1 bg-transparent outline-none text-sm"
                  placeholder="0.00"
                />
                <div className="text-sm opacity-90">USDT</div>
                <button
                  type="button"
                  onClick={() => setTransferAmount(String((masterCard.balance ?? 0).toFixed(2)))}
                  className="text-sm font-semibold opacity-80 hover:opacity-100 transition"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Select card */}
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2"> </div>
              <div className="rounded-xl border border-white/10 bg-black/30 h-12 px-3 flex items-center">
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                >
                  <option value="">Select a card…</option>
                  {transferTargets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.holder} •••• {c.ending}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {transferError ? (
              <div className="mt-3 text-sm text-rose-200/90">{transferError}</div>
            ) : null}

            {/* Actions */}
            <div className="mt-4 grid gap-3">
              <button
                onClick={() => setTransferSheet("option")}
                className="h-12 rounded-xl border border-white/15 bg-white/0 text-sm font-semibold opacity-90 hover:bg-white/5 transition"
                disabled={transferLoading}
              >
                Back
              </button>

              <button
                onClick={() => setTransferError("Transfer History n’est pas disponible sur cette maquette.")}
                className="h-12 rounded-xl border border-white/15 bg-white/0 text-sm font-semibold opacity-90 hover:bg-white/5 transition"
                disabled={transferLoading}
              >
                Transfer History
              </button>

              <button
                onClick={confirmTransfer}
                className="h-12 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-50 hover:opacity-95 transition"
                disabled={transferLoading || !transferToId}
              >
                {transferLoading ? "Processing..." : "Request Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* DEPOSIT MODAL */}
      {/* ---------------------- */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/95" onClick={closeDeposit} />

          <div className="relative w-full max-w-[620px]">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  {/* ✅ 5 taps here to show the hidden toggle */}
                  <div
                    className="text-lg font-semibold select-none"
                    onClick={onDepositTitleTap}
                  >
                    Deposit
                  </div>
                  <div className="text-sm opacity-70 mt-1">
                    Pour déposer, vous devez lever le plafond (validation manuelle).
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

                {/* ✅ hidden per-card toggle (appears only after 5 taps) */}
                {showSecretToggle && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium opacity-90">
                        (interne) Échec plafond — cette carte
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleFailForThisCard(!forceFailLocal)}
                        className={
                          forceFailLocal
                            ? "h-9 px-3 rounded-lg bg-rose-200 text-black text-sm font-medium"
                            : "h-9 px-3 rounded-lg bg-white/10 border border-white/10 text-sm"
                        }
                      >
                        {forceFailLocal ? "ON" : "OFF"}
                      </button>
                    </div>

                    <div className="text-xs text-white/45 mt-2">
                      Astuce : retape 5 fois sur “Deposit” pour masquer ce bouton.
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">Frais de levée de plafond</div>

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

                <div className="text-xs text-white/45" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* CONFIRMATION OVERLAY (deposit/transfer) - style like screenshot */}
      {/* ---------------------- */}
      {confirmOverlay.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/90" onClick={closeConfirmOverlay} />

          <div className="relative w-full max-w-[520px]">
            {/* top toast */}
            <div className="absolute -top-16 left-0 right-0 mx-auto w-full">
              <div className="rounded-xl border border-white/10 bg-black/85 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.65)]">
                <div className="text-sm font-semibold">{confirmOverlay.titleTop}</div>
                <div className="text-xs opacity-70 mt-0.5">{confirmOverlay.subtitleTop}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_90px_rgba(0,0,0,0.8)] p-6">
              <div className="flex items-start justify-between">
                <div className="text-sm opacity-0 select-none">.</div>
                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
                  onClick={closeConfirmOverlay}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {confirmOverlay.kind === "error" ? (
                <>
                  <div className="mt-1 text-center">
                    <div className="text-xl font-semibold text-rose-200/90">
                      Erreur
                    </div>
                    <div className="text-sm opacity-70 mt-1">
                      Validation des plafonds requise
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 leading-6 whitespace-pre-line">
                    {confirmOverlay.longErrorText ?? "Erreur réseau."}
                  </div>

                  <div className="mt-5">
                    <button
                      className="h-12 w-full rounded-xl bg-white text-black text-sm font-semibold hover:opacity-95 transition"
                      onClick={closeConfirmOverlay}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-1 text-center">
                    <div className="text-xl font-semibold">Payment Succeeded!</div>

                    <div className="mt-6 flex justify-center">
                      <div className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    </div>

                    <div className="mt-6 text-2xl font-semibold leading-9">
                      {confirmTitle}
                    </div>

                    <div className="mt-4 text-sm opacity-60">
                      Invoice ID: {confirmOverlay.invoiceId}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/10" />

                  <div className="mt-5 text-sm">
                    <div className="flex items-center justify-between py-1.5">
                      <div className="opacity-70">
                        {confirmOverlay.context === "transfer"
                          ? "Transfer Amount"
                          : "Card Recharge Amount"}
                      </div>
                      <div className="font-semibold">
                        {formatMoney(confirmOverlay.amountUsd, "USD")}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <div className="opacity-70">
                        {confirmOverlay.context === "transfer"
                          ? "Withhold Fee"
                          : "Deposit Fee"}
                      </div>
                      <div className="font-semibold">
                        {formatMoney(confirmOverlay.feeUsd, "USD")}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <div className="opacity-70">
                        {confirmOverlay.context === "transfer"
                          ? "Service Fee"
                          : "Card Opening Fee"}
                      </div>
                      <div className="font-semibold">
                        {formatMoney(confirmOverlay.openingFeeUsd, "USD")}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <div className="opacity-70">
                        {confirmOverlay.context === "transfer"
                          ? "Transfer Amount"
                          : "Deposit Amount"}
                      </div>
                      <div className="font-semibold">
                        {confirmOverlay.solAmount} SOL
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <div className="opacity-70">Invoice Date</div>
                      <div className="font-semibold">
                        {new Date(confirmOverlay.dateIso).toLocaleString("fr-FR")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/10" />

                  <div className="mt-6">
                    <button
                      className="h-12 w-full rounded-xl bg-white text-black text-sm font-semibold hover:opacity-95 transition"
                      onClick={() => {
                        closeConfirmOverlay();
                        // optionnel: scroll / keep on card
                      }}
                    >
                      View your SolCard
                    </button>
                  </div>

                  {confirmOverlay.note ? (
                    <div className="mt-3 text-xs text-white/40">
                      {confirmOverlay.note}
                      {" • "}
                      Ref: {confirmOverlay.ref}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-white/40">
                      Ref: {confirmOverlay.ref}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DottedBackground>
  );
}
