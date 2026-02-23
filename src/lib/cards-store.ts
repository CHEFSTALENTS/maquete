import type { Card, Transaction } from "@/lib/mock-data";
import { cards as seedCards } from "@/lib/mock-data";

const LS_KEY = "solcard_mock_cards_v1";

type FeeEur = 150 | 250 | 400;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
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
  const first = [
    "Mathew",
    "Julien",
    "Lucas",
    "Ethan",
    "Maxime",
    "Noah",
    "Leo",
    "Hugo",
    "Nathan",
    "Oscar",
    "Mila",
    "Lina",
    "Emma",
    "Chloe",
    "Jade",
  ];
  const last = [
    "Verbick",
    "Dupont",
    "Martin",
    "Bernard",
    "Moreau",
    "Roux",
    "Fournier",
    "Girard",
    "Lambert",
    "Fontaine",
    "Chevalier",
    "Masson",
  ];
  return `${first[randInt(0, first.length - 1)]} ${
    last[randInt(0, last.length - 1)]
  }`.toUpperCase();
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
  // base58-like (looks like Solana, fake)
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const len = randInt(40, 44);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
  return out;
}

export function pickFeeEuro(): FeeEur {
  const fees = [150, 250, 400] as const;
  return fees[randInt(0, fees.length - 1)];
}

function nowIso() {
  return new Date().toISOString();
}

function makeTopup(amount: number, whenIso = nowIso()): Transaction {
  return {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Auth",
    status: "Succeed",
    description: "Topup - Card Funding",
    amount: Number(amount.toFixed(2)),
    date: whenIso,
  };
}

/**
 * ✅ Preview generation (for the modal):
 * - returns address + selected fee
 * - returns a *draft* card (still balance 0 here; finalization happens in finalizeCardForSlot)
 */
export function createCardForSlot(slot: string, feeEur?: FeeEur) {
  const chosenFee: FeeEur = feeEur ?? pickFeeEuro();

  const last4 = pad4(randInt(0, 9999));
  const id = `solcard-${Date.now()}-${randInt(100, 999)}`;

  const pan = makePan(last4);

  const card: Card = {
    id,
    name: "SolCard",
    pan,
    cvv: String(randInt(100, 999)),
    ending: last4,
    holder: randomHolder(),
    expires: makeExpiry(),

    balance: 0,
    depositUsed: 0,
    depositLimit: 100000,

    transactions: [], // ✅ must be empty for new cards
    topups: [],

    issuanceFeeEur: chosenFee, // ✅ store the chosen fee
  };

  const solAddress = generateSolanaAddress();
  return { card, feeEur: chosenFee, solAddress, slot };
}

/**
 * ✅ Finalize creation at "Activate":
 * - gives initial balance between 40 and 60
 * - writes a topup entry at current date/time equal to that initial balance
 * - keeps transactions empty
 */
export function finalizeNewCard(card: Card): Card {
  const initial = randInt(40, 60);
  const topup = makeTopup(initial);

  return {
    ...card,
    balance: Number(initial.toFixed(2)),
    depositUsed: Number(initial.toFixed(2)),
    transactions: [], // ✅ stays empty
    topups: [topup], // ✅ initial topup = initial balance
  };
}

/**
 * ✅ Deposit flow for an existing card:
 * - adds amount to balance
 * - adds topup row (date/time now)
 * - transactions unchanged
 */
export function depositToCard(cards: Card[], cardId: string, amount: number): Card[] {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return cards;

  const topup = makeTopup(amt);

  return cards.map((c) => {
    if (c.id !== cardId) return c;

    const nextBalance = Number(((c.balance ?? 0) + amt).toFixed(2));
    const nextDepositUsed = Number(((c.depositUsed ?? 0) + amt).toFixed(2));

    return {
      ...c,
      balance: nextBalance,
      depositUsed: nextDepositUsed,
      // ✅ transactions untouched
      transactions: c.transactions ?? [],
      // ✅ record topup
      topups: [topup, ...(c.topups ?? [])],
    };
  });
}

/**
 * ✅ If you ever need "balance becomes EXACT deposit amount" (old behavior),
 * keep this helper. Not used for your current requirement.
 */
export function applyTopupExactBalance(cards: Card[], cardId: string, amount: number): Card[] {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) return cards;

  const topup = makeTopup(amt);

  return cards.map((c) => {
    if (c.id !== cardId) return c;
    return {
      ...c,
      balance: Number(amt.toFixed(2)),
      depositUsed: Number(amt.toFixed(2)),
      transactions: c.transactions ?? [],
      topups: [topup, ...(c.topups ?? [])],
    };
  });
}
export function recordFailedTopup(cards: Card[], cardId: string, amount: number): Card[] {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return cards;

  const topup: Transaction = {
    id: `p-fail-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    type: "Auth",
    status: "Failed",
    description: "Topup - Deposit failed (see details)",
    amount: Number(amt.toFixed(2)),
    date: new Date().toISOString(),
  };

  return cards.map((c) => {
    if (c.id !== cardId) return c;
    return {
      ...c,
      transactions: c.transactions ?? [],
      topups: [topup, ...(c.topups ?? [])],
    };
  });
}
