import type { Card, Transaction } from "@/lib/mock-data";
import { cards as seedCards } from "@/lib/mock-data";

const LS_KEY = "solcard_mock_cards_v1";

export type ActivationFeeEur = 150 | 250 | 400;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function nowIso() {
  return new Date().toISOString();
}

function makeTopup(amount: number, whenIso = nowIso(), status: "Succeed" | "Failed" = "Succeed"): Transaction {
  return {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Auth",
    status,
    description: status === "Succeed" ? "Topup - Card Funding" : "Deposit failed",
    amount: Number(amount.toFixed(2)),
    date: whenIso,
  };
}

function makePan(last4: string) {
  const a = pad4(randInt(1000, 9999));
  const b = pad4(randInt(1000, 9999));
  const c = pad4(randInt(1000, 9999));
  return `${a} ${b} ${c} ${last4}`;
}

function makeExpiry() {
  const mm = String(randInt(1, 12)).padStart(2, "0");
  const yy = String(randInt(27, 32)); // 2027-2032
  return `${mm}/${yy}`;
}

function randomHolder() {
  const first = ["Mathew", "Julien", "Lucas", "Ethan", "Maxime", "Noah", "Leo", "Hugo", "Nathan", "Oscar", "Mila", "Lina", "Emma", "Chloe", "Jade"];
  const last = ["Verbick", "Dupont", "Martin", "Bernard", "Moreau", "Roux", "Fournier", "Girard", "Lambert", "Fontaine", "Chevalier", "Masson"];
  return `${first[randInt(0, first.length - 1)]} ${last[randInt(0, last.length - 1)]}`.toUpperCase();
}

export function loadCards(): Card[] {
  if (typeof window === "undefined") return seedCards;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return seedCards;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedCards;
    return parsed as Card[];
  } catch {
    return seedCards;
  }
}

export function saveCards(cards: Card[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(cards));
}

export function generateSolanaAddress() {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const len = randInt(40, 44);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
  return out;
}

export function pickActivationFeeEuro(): ActivationFeeEur {
  const fees: ActivationFeeEur[] = [150, 250, 400];
  return fees[randInt(0, fees.length - 1)];
}

/**
 * ✅ STEP 1 — Generate card (DRAFT)
 * - no balance
 * - no topups
 * - no transactions
 * - isActive=false
 */
export function createDraftCardForSlot(slot: string) {
  const last4 = pad4(randInt(0, 9999));
  const id = `solcard-${Date.now()}-${randInt(100, 999)}`;

  const card: Card = {
    id,
    name: "SolCard",
    pan: makePan(last4),
    cvv: String(randInt(100, 999)),
    ending: last4,

    holder: randomHolder(),
    expires: makeExpiry(),

    balance: 0,
    depositUsed: 0,
    depositLimit: 100000,

    transactions: [], // ✅ empty
    topups: [], // ✅ empty

    isActive: false, // ✅ draft
  };

  const solAddress = generateSolanaAddress();
  return { card, solAddress, slot };
}

/**
 * ✅ STEP 2 — Activate card (pay activation fee)
 * - sets activationFeeEur
 * - credits initial balance between 40-60
 * - adds 1 topup = initial balance (now)
 * - keeps transactions empty
 * - isActive=true
 */
export function activateCard(cards: Card[], cardId: string, feeEur: ActivationFeeEur): Card[] {
  const initial = randInt(40, 60);
  const topup = makeTopup(initial);

  return cards.map((c) => {
    if (c.id !== cardId) return c;

    // already active → keep state (idempotent)
    if (c.isActive) return c;

    return {
      ...c,
      isActive: true,
      activationFeeEur: feeEur,
      balance: Number(initial.toFixed(2)),
      depositUsed: Number(initial.toFixed(2)),
      transactions: [], // ✅ still empty
      topups: [topup], // ✅ first funding
    };
  });
}

/**
 * ✅ STEP 3 — Deposit (already activated card)
 * - adds amount to balance
 * - adds topup row (now)
 * - transactions unchanged
 */
export function depositToCard(cards: Card[], cardId: string, amount: number): Card[] {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return cards;

  const topup = makeTopup(amt);

  return cards.map((c) => {
    if (c.id !== cardId) return c;

    // If card isn't active, refuse silently (UI will handle messaging)
    if (!c.isActive) return c;

    const nextBalance = Number(((c.balance ?? 0) + amt).toFixed(2));
    const nextDepositUsed = Number(((c.depositUsed ?? 0) + amt).toFixed(2));

    return {
      ...c,
      balance: nextBalance,
      depositUsed: nextDepositUsed,
      transactions: c.transactions ?? [],
      topups: [topup, ...(c.topups ?? [])],
    };
  });
}
