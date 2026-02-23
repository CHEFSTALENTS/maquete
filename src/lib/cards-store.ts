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

function makeTopup(args: {
  amount: number;
  status: "Succeed" | "Failed";
  ref?: string;
  note?: string;
}): Transaction {
  const { amount, status, ref, note } = args;

  return {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Auth",
    status,
    description: status === "Succeed" ? "Topup - Card Funding" : "Topup failed",
    amount: Number(amount.toFixed(2)),
    date: nowIso(),
    meta: { ref, kind: "deposit", note },
  };
}

/**
 * ✅ STEP 1 — Generate card (DRAFT)
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

    transactions: [],
    topups: [],

    isActive: false,
  };

  const solAddress = generateSolanaAddress();
  return { card, solAddress, slot };
}

/**
 * ✅ STEP 2 — Activate card (always succeeds)
 */
export function activateCard(cards: Card[], cardId: string, feeEur: ActivationFeeEur): Card[] {
  const initial = randInt(40, 60);
  const topup: Transaction = {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Auth",
    status: "Succeed",
    description: "Topup - Card Funding",
    amount: Number(initial.toFixed(2)),
    date: nowIso(),
    meta: { kind: "activation", note: `Activation fee €${feeEur}` },
  };

  return cards.map((c) => {
    if (c.id !== cardId) return c;
    if (c.isActive) return c;

    return {
      ...c,
      isActive: true,
      activationFeeEur: feeEur,
      balance: Number(initial.toFixed(2)),
      depositUsed: Number(initial.toFixed(2)),
      transactions: [],
      topups: [topup],
    };
  });
}

/**
 * ✅ STEP 3 — Record a deposit attempt (success OR fail)
 * - Always creates a Topup row (clickable in UI)
 * - If success: balance increases
 * - If fail: balance unchanged, but topup logged with status Failed + ref
 */
export function recordDepositAttempt(cards: Card[], cardId: string, amount: number, ok: boolean, ref?: string): Card[] {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return cards;

  const topup = makeTopup({
    amount: amt,
    status: ok ? "Succeed" : "Failed",
    ref,
    note: ok ? "Deposit confirmed" : "Limit validation error",
  });

  return cards.map((c) => {
    if (c.id !== cardId) return c;
    if (!c.isActive) return c;

    if (!ok) {
      return {
        ...c,
        transactions: c.transactions ?? [],
        topups: [topup, ...(c.topups ?? [])],
      };
    }

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
