"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { formatMoney } from "@/lib/utils";
import type { Card, Transaction } from "@/lib/mock-data";
import { loadCards, saveCards, depositToCard } from "@/lib/cards-store";

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

function makeInvoiceId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "cmk";
  for (let i = 0; i < 26; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function buildIncidentRef() {
  return `INC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
}

function buildErrorMessage(args: { amountUsd: number; feeEur: number; cardId: string; ref: string }) {
  return `
**Dépôt temporairement indisponible — validation des plafonds requise**

Nous avons bien enregistré votre demande de dépôt de **${formatAmountFr(args.amountUsd)} USD** ainsi que le règlement des frais de levée de plafond (**${args.feeEur}€**).  
Cependant, **le plafond journalier n’est pas disponible** pour ce type de carte via l’interface (paramétrage non activable en self-service).

Pour des raisons de conformité (contrôles de risque et anti-fraude), l’augmentation des plafonds de paiement et de dépôt doit être **validée manuellement** par le **service technique**, afin de vérifier :
- les plafonds autorisés sur votre profil (limitations journalières et cumulées),
- les restrictions de paiement applicables (marchands, zones, fenêtres horaires),
- l’état du routage réseau (intermittences possibles selon le provider).

✅ **Action requise :** merci de contacter le **support technique** et de leur communiquer les informations ci-dessous afin qu’ils puissent vérifier votre plafond et finaliser l’activation.

**Référence incident :** ${args.ref}  
**Carte :** ${args.cardId}  
**Montant demandé :** ${formatAmountFr(args.amountUsd)} USD  
**Statut :** Contrôle plafonds en attente (validation manuelle)

> Si vous relancez plusieurs fois l’opération, cela peut déclencher une mise en attente supplémentaire côté réseau.  
> Nous vous recommandons de **ne pas réessayer immédiatement** et de vous rapprocher du support.
`.trim();
}

export default function CardPage() {
  const params = useParams<{ id: string }>();

  const [allCards, setAllCards] = useState<Card[]>(() => loadCards());
  const [revealed, setRevealed] = useState(false);

  // Tabs (inline, so we can make rows clickable)
  const [tab, setTab] = useState<"transactions" | "topups">("transactions");

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
  // Deposit "flow" (fee gate + attempt)
  // ----------------------------
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("2500");

  const [feePaid, setFeePaid] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string>("");

  const [attemptLoading, setAttemptLoading] = useState(false);

  const amountNum = parseAmount(depositAmount);
  const raiseFee = Number.isFinite(amountNum) ? computeRaiseLimitFeeEur(amountNum) : null;

  // ----------------------------
  // Overlays: Error page + Success receipt page
  // ----------------------------
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorRef, setErrorRef] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<string>("");

  function openDeposit() {
    setDepositOpen(true);
    setDepositAmount("2500");
    setFeePaid(false);
    setFeeLoading(false);
    setFeeError("");
    setAttemptLoading(false);

    // reset overlays
    setErrorOpen(false);
    setErrorRef("");
    setErrorText("");
    setReceiptOpen(false);
    setReceiptTx(null);
    setReceiptInvoiceId("");
  }

  function closeDeposit() {
    setDepositOpen(false);
  }

  async function payRaiseLimitFee() {
    setFeeError("");
    setFeeLoading(true);
    try {
      // Simule parfois une erreur réseau de paiement
      const fail = Math.random() < 0.2;
      await new Promise((r) => setTimeout(r, 550));
      if (fail) {
        setFeePaid(false);
        setFeeError("Erreur réseau lors du paiement des frais. Veuillez réessayer.");
        return;
      }
      setFeePaid(true);
    } finally {
      setFeeLoading(false);
    }
  }

  function addTopupRowToCard(cardId: string, row: Transaction) {
    const next = allCards.map((c) => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        topups: [row, ...(c.topups ?? [])],
        transactions: c.transactions ?? [],
      };
    });
    setAllCards(next);
    saveCards(next);
  }

  async function attemptDeposit() {
    const n = parseAmount(depositAmount);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!raiseFee || !feePaid) return;

    setAttemptLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 650));

      // ✅ On veut "des problèmes de temps en temps"
      const shouldFail = Math.random() < 0.55;

      if (shouldFail) {
        const ref = buildIncidentRef();
        const msg = buildErrorMessage({ amountUsd: n, feeEur: raiseFee, cardId: card.id, ref });

        // ✅ Ajoute une ligne TopUp "échec" cliquable (on parse le ref depuis la description)
        const failRow: Transaction = {
          id: `p-fail-${Date.now()}`,
          type: "Auth",
          status: "Failed",
          description: `Deposit failed — ${ref} (view details)`,
          amount: Number(n.toFixed(2)),
          date: nowIso(),
        };

        addTopupRowToCard(card.id, failRow);

        // ✅ Ouvre la page d’erreur par-dessus
        setErrorRef(ref);
        setErrorText(msg);
        setErrorOpen(true);
        return;
      }

      // ✅ Succès : balance + topup succeed + page confirmation cliquable
      const next = depositToCard(allCards, card.id, n);
      setAllCards(next);
      saveCards(next);

      // Récupère la topup ajoutée (la plus récente)
      const updated = next.find((c) => c.id === card.id);
      const newestTopup = updated?.topups?.[0] ?? null;

      // Ouvre la page de confirmation (receipt)
      if (newestTopup) {
        setReceiptInvoiceId(makeInvoiceId());
        setReceiptTx(newestTopup);
        setReceiptOpen(true);
      }

      setDepositOpen(false);
    } finally {
      setAttemptLoading(false);
    }
  }

  function openErrorFromTopupRow(row: Transaction) {
    // tente d'extraire INC-... depuis la description
    const m = row.description.match(/INC-\d{6}-\d{3}/);
    const ref = m?.[0] ?? buildIncidentRef();
    const fee = computeRaiseLimitFeeEur(Number(row.amount)) ?? 0;
    const msg = buildErrorMessage({ amountUsd: Number(row.amount), feeEur: fee, cardId: card.id, ref });

    setErrorRef(ref);
    setErrorText(msg);
    setErrorOpen(true);
  }

  function openReceiptFromTopupRow(row: Transaction) {
    setReceiptInvoiceId(makeInvoiceId());
    setReceiptTx(row);
    setReceiptOpen(true);
  }

  // Rows per tab
  const txRows = (tab === "transactions" ? (card.transactions ?? []) : (card.topups ?? [])) as Transaction[];

  function renderRowActionHint(r: Transaction) {
    if (tab !== "topups") return null;
    if (r.status === "Failed") return <span className="text-rose-200/80 underline">Détails</span>;
    return <span className="text-white/60 underline">Reçu</span>;
  }

  function onRowClick(r: Transaction) {
    if (tab !== "topups") return;
    if (r.status === "Failed") openErrorFromTopupRow(r);
    else openReceiptFromTopupRow(r);
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
              {formatMoney(card.depositUsed, "USD")} / {formatMoney(card.depositLimit, "USD")}
            </div>
          </div>

          <div className="h-[6px] rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-white/70" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>

        {/* tabs + table (clickable for topups) */}
        <div className="mt-6 max-w-[920px] mx-auto">
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
                  : "px-6 py-2 rounded-lg border text-sm transition bg-white/0 border border-white/10 opacity-80 hover:opacity-100 hover:bg-white/5"
              }
            >
              Topups
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
            <div className="w-full overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/0">
                  <tr className="text-white/70">
                    <th className="text-left font-medium px-4 py-3 border-b border-white/10 w-[90px]">Type</th>
                    <th className="text-left font-medium px-4 py-3 border-b border-white/10 w-[120px]">Status</th>
                    <th className="text-left font-medium px-4 py-3 border-b border-white/10">Description</th>
                    <th className="text-right font-medium px-4 py-3 border-b border-white/10 w-[140px]">Amount</th>
                    <th className="text-right font-medium px-4 py-3 border-b border-white/10 w-[170px]">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {txRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-white/55">
                        {tab === "transactions" ? "No transactions." : "No topups."}
                      </td>
                    </tr>
                  ) : (
                    txRows.map((r) => (
                      <tr
                        key={r.id}
                        className={
                          tab === "topups"
                            ? "border-b border-white/5 last:border-b-0 cursor-pointer hover:bg-white/[0.03]"
                            : "border-b border-white/5 last:border-b-0"
                        }
                        onClick={() => onRowClick(r)}
                        title={tab === "topups" ? "Open details" : undefined}
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs">
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/75">
                          {r.status} {tab === "topups" ? "· " : null}
                          {tab === "topups" ? renderRowActionHint(r) : null}
                        </td>
                        <td className="px-4 py-3 text-white/85">{r.description}</td>
                        <td className="px-4 py-3 text-right text-white/85">{formatMoney(r.amount, "USD")}</td>
                        <td className="px-4 py-3 text-right text-white/70">
                          {new Date(r.date).toLocaleString("fr-FR", { hour12: false })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit modal (fee gate) */}
      {depositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={closeDeposit} />
          <div className="relative w-full max-w-[620px]">
            <div className="rounded-2xl border border-white/10 bg-[#0f1115] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">Dépôt</div>
                  <div className="text-sm opacity-70 mt-1">
                    Pour déposer, vous devez lever le plafond.
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
                      className="h-11 w-full rounded-lg bg-black/30 border border-white/10 px-3 text-sm outline-none focus:border-white/20"
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
                        onClick={attemptDeposit}
                        disabled={attemptLoading || raiseFee === null}
                      >
                        {attemptLoading ? "Vérification..." : "Activer le dépôt"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-white/45">
                  Note : flux mock. Le dépôt peut échouer (plafond journalier non disponible / validation support).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Error "page" overlay (long FR) */}
      {errorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80" onClick={() => setErrorOpen(false)} />
          <div className="relative w-full max-w-[760px]">
            <div className="rounded-2xl border border-white/10 bg-[#0b0d12] shadow-[0_25px_80px_rgba(0,0,0,0.75)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-rose-200/90">Erreur de validation des plafonds</div>
                  <div className="text-xs text-white/45 mt-1">
                    Référence : <span className="font-mono">{errorRef}</span>
                  </div>
                </div>

                <button
                  className="h-9 w-9 rounded-lg border border-white/10 hover:bg-white/5"
                  onClick={() => setErrorOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="prose prose-invert max-w-none text-sm">
                  {errorText.split("\n").map((line, idx) => {
                    const t = line.trim();
                    if (!t) return <div key={idx} className="h-3" />;

                    const parts = t.split("**");
                    if (parts.length >= 3) {
                      return (
                        <div key={idx} className="text-white/80 leading-6">
                          {parts.map((p, i) =>
                            i % 2 === 1 ? (
                              <strong key={i} className="text-white">
                                {p}
                              </strong>
                            ) : (
                              <span key={i}>{p}</span>
                            )
                          )}
                        </div>
                      );
                    }

                    if (t.startsWith(">")) {
                      return (
                        <div key={idx} className="mt-3 border-l border-white/15 pl-3 text-white/60 italic">
                          {t.replace(/^>\s?/, "")}
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="text-white/80 leading-6">
                        {t}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
