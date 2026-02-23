import type { Card, Transaction } from "@/lib/mock-data";
import { cards as seedCards } from "@/lib/mock-data";

const LS_KEY = "solcard_mock_cards_v1";

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

export function pickFeeEuro() {
  const fees = [150, 250, 400] as const;
  return fees[randInt(0, fees.length - 1)];
}

export function createCardForSlot(slot: string) {
  const last4 = pad4(randInt(0, 9999));
  const id = `solcard-${Date.now()}-${randInt(100, 999)}`;

  const card: Card = {
    id,
    name: "SolCard",
    ending: last4,
    holder: randomHolder(),
    expires: makeExpiry(),
    balance: 0,
    depositUsed: 0,
    depositLimit: 100000,
    transactions: [], // ✅ empty
    topups: [],       // ✅ empty
    pan: makePan(last4),
    cvv: String(randInt(100, 999)),
  } as Card;

  const feeEur = pickFeeEuro();
  const solAddress = generateSolanaAddress();

  return { card, feeEur, solAddress, slot };
}

export function applyTopupExactBalance(cards: Card[], cardId: string, amount: number): Card[] {
  const nowIso = new Date().toISOString();

  const topup: Transaction = {
    id: `p-${Date.now()}`,
    type: "Auth",
    status: "Succeed",
    description: "Topup - Card Funding",
    amount: Number(amount.toFixed(2)),
    date: nowIso,
  };

  return cards.map((c) => {
    if (c.id !== cardId) return c;

    // ✅ transactions remain unchanged (should stay empty unless you later add)
    return {
      ...c,
      balance: Number(amount.toFixed(2)),      // ✅ balance EXACTLY = deposit amount
      depositUsed: Number(amount.toFixed(2)),  // ✅ can mirror balance for mock
      topups: [topup, ...(c.topups ?? [])],    // ✅ topup equals shown balance
    };
  });
}
