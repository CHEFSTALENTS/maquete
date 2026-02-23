"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";
import type { Card } from "@/lib/mock-data";
import { loadCards, saveCards, recordDepositAttempt, setCardForceLimitFail } from "@/lib/cards-store";

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
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
}

function makeIncidentRef(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
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

  // per-card toggle UI
  const [forceFailLocal, setForceFailLocal] = useState<boolean>(!!card.forceLimitFail);

  useEffect(() => {
    setForceFailLocal(!!card.forceLimitFail);
  }, [card?.id]);

  const amountNum = parseAmount(depositAmount);
  const raiseFee = Number.isFinite(amountNum) ? computeRaiseLimitFeeEur(amountNum) : null;

  // ----------------------------
  // Overlay (Success / Error)
  // ----------------------------
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayKind, setOverlayKind] = useState<"success" | "error">("success");
  const [overlayRef, setOverlayRef] = useState("");
  const [overlayAmount, setOverlayAmount] = useState(0);
  const [overlayDate, setOverlayDate] = useState("");
  const [overlayNote, setOverlayNote] = useState("");

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
      setOverlayOpen(true);
    }

    window.addEventListener("solcard:topup:open", onOpen as any);
    return () => window.removeEventListener("solcard:topup:open", onOpen as any);
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
      // fee payment can fail sometimes (optional)
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

  function longFrenchLimitError(ref: string, amountUsd: number, feeEur: number) {
    return [
      "Dépôt temporairement indisponible — validation des plafonds requise",
      "",
      `Nous avons bien enregistré votre demande de dépôt de ${formatAmountFr(amountUsd)} USD ainsi que le règlement des frais de levée de plafond (${feeEur}€).`,
      "",
      "Cependant, sur ce type de carte, le plafond journalier n’est pas activable automatiquement via l’interface.",
      "L’augmentation effective des plafonds de paiement/dépôt doit être validée manuellement par le service technique (conformité, anti-fraude, restrictions marchands, routage réseau).",
      "",
      "Action requise : merci de contacter le service technique afin qu’ils vérifient les plafonds autorisés et débloquent l’activation.",
      "",
      `Référence incident : ${ref}`,
      `Carte : ${card.id}`,
      `Montant demandé : ${formatAmountFr(amountUsd)} USD`,
      "",
      "Conseil : évitez de relancer l’opération en boucle. Cela peut déclencher une mise en attente supplémentaire côté réseau/provider.",
    ].join("\n");
  }

  async function confirmDeposit() {
    const n = parseAmount(depositAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!raiseFee || !feePaid) return;

    setConfirmLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 550));

      const ref = makeIncidentRef("INC");
      const ok = !card.forceLimitFail; // ✅ per-card control

      const next = recordDepositAttempt(allCards, card.id, n, ok, ref);
      setAllCards(next);
      saveCards(next);

      setDepositOpen(false);

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

          <div className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center text-sm font-semibold">
            {formatMoney(card.balance, "USD")}
          </div>
        </div>

        {/* card area */}
        <div className="mt-10 flex items-center justify-center gap-10">
          <button className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center" aria-label="Previous card">
            ←
          </button>

          <div className="relative w-full max-w-[480px] aspect-[1.586/1] rounded-2xl overflow-hidden border border-white/10 bg-[#16181d] shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/40" />

            <div className="absolute left-5 top-4 flex items-center gap-3">
              <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs">Billing</div>

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

            <div className="absolute right-6 top-5 text-xl font-semibold tracking-wide">SolCard</div>
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

          <button className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center" aria-label="Next card">
            →
          </button>
        </div>

        {/* usage bar */}
        <div className="mt-8 max-w-[820px] mx-auto">
          <div className="flex items-center justify-between text-sm opacity-85 mb-2">
            <div>{pct}% of your monthly deposit limit used</div>
            <div>
              {formatMoney(card.depositUsed, "USD")} / {formatMoney(card.depositLimit, "USD")}
            </div>
          </div>
          <div className="h-[6px] rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-white/70" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>

        {/* tabs */}
        <div className="mt-6 max-w-[920px] mx-auto">
          <CardTabs cardId={card.id} />
        </div>
      </div>

      {/* Deposit modal (FULL / not transparent) */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* ✅ overlay stronger => no dots visible */}
          <div className="absolute inset-0 bg-black/95" onClick={closeDeposit} />

          <div className="relative w-full max-w-[620px]">
            {/* ✅ modal solid => no background bleed */}
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Deposit</div>
                  <div className="text-sm opacity-70 mt-1">
                    Pour déposer, vous devez lever le plafond (validation manuelle).
                  </div>
                </div>
                <button className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5" onClick={closeDeposit}>
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

                {/* ✅ per-card discreet toggle */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Mode simulation (cette carte)</div>
                      <div className="text-xs text-white/55 mt-1">
                      </div>
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
                      {forceFailLocal ? "Échec plafond: ON" : "Échec plafond: OFF"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs opacity-70">Frais de levée de plafond</div>

                  {!Number.isFinite(amountNum) ? (
                    <div className="mt-1 text-sm text-white/60">Entrez un montant valide.</div>
                  ) : raiseFee === null ? (
                    <div className="mt-1 text-sm text-rose-200/90">
                      Montant non éligible (choisissez un palier valide).
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-2xl font-semibold">€{raiseFee}</div>
                      <div className="text-sm opacity-70">{feePaid ? "Payé ✅" : "Non payé"}</div>
                    </div>
                  )}

                  {feeError ? <div className="mt-3 text-sm text-rose-200/90">{feeError}</div> : null}

                  <div className="mt-4 flex items-center justify-end gap-3">
                    {!feePaid ? (
                      <button
                        className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95 disabled:opacity-50"
                        onClick={payRaiseLimitFee}
                        disabled={feeLoading || raiseFee === null || !Number.isFinite(amountNum)}
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

                <div className="text-xs text-white/45">
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay page (success/error) */}
      {overlayOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/90" onClick={() => setOverlayOpen(false)} />
          <div className="relative w-full max-w-[760px]">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={`text-lg font-semibold ${overlayKind === "success" ? "text-emerald-200/90" : "text-rose-200/90"}`}>
                    {overlayKind === "success" ? "Dépôt confirmé" : "Erreur de validation des plafonds"}
                  </div>
                  <div className="text-xs text-white/45 mt-1">
                    Référence : <span className="font-mono">{overlayRef}</span>
                  </div>
                </div>

                <button className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5" onClick={() => setOverlayOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 leading-6 whitespace-pre-line">
                {overlayKind === "success" ? (
                  <>
                    Votre dépôt de <span className="text-white font-semibold">{formatAmountFr(overlayAmount)} USD</span> a été pris en compte.
                    {"\n\n"}
                    Un enregistrement TopUp a été créé au moment de la confirmation.
                    {"\n"}
                    Date : {overlayDate ? new Date(overlayDate).toLocaleString("fr-FR") : "—"}
                    {"\n\n"}
                    Référence : {overlayRef}
                  </>
                ) : (
                  (() => {
                    const fee = computeRaiseLimitFeeEur(overlayAmount) ?? 0;
                    return [
                      `Dépôt temporairement indisponible — validation des plafonds requise`,
                      ``,
                      `Nous avons bien enregistré votre demande de dépôt de ${formatAmountFr(overlayAmount)} USD ainsi que le règlement des frais de levée de plafond (${fee}€).`,
                      ``,
                      `Cependant, sur ce type de carte, le plafond journalier n’est pas activable automatiquement via l’interface.`,
                      `L’augmentation effective des plafonds de paiement/dépôt doit être validée manuellement par le service technique.`,
                      ``,
                      `Référence incident : ${overlayRef}`,
                      `Carte : ${card.id}`,
                      `Montant demandé : ${formatAmountFr(overlayAmount)} USD`,
                      ``,
                      `Merci de vous rapprocher du support technique pour vérification des plafonds autorisés.`,
                    ].join("\n");
                  })()
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button className="h-10 px-4 rounded-lg border border-white/10 hover:bg-white/5" onClick={() => setOverlayOpen(false)}>
                  Fermer
                </button>
                <button className="h-10 px-5 rounded-lg bg-white text-black font-medium hover:opacity-95" onClick={() => setOverlayOpen(false)}>
                  OK
                </button>
              </div>

              {overlayNote ? <div className="mt-3 text-xs text-white/35">{overlayNote}</div> : null}
            </div>
          </div>
        </div>
      )}
    </DottedBackground>
  );
}
