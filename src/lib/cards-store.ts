import type { Card } from "@/lib/mock-data";
import { cards as seedCards } from "@/lib/mock-data";

const LS_KEY = "solcard_mock_cards_v1";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function makePan(last4: string) {
  // fake but consistent format
  const a = pad4(randInt(1000, 9999));
  const b = pad4(randInt(1000, 9999));
  const c = pad4(randInt(1000, 9999));
  return `${a} ${b} ${c} ${last4}`;
}

function makeExpiry() {
  const mm = pad4(randInt(1, 12)).slice(-2);
  const yy = String(randInt(27, 32)); // 2027-2032
  return `${mm}/${yy}`;
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
  // fake Solana-like base58 length-ish
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const len = randInt(40, 44);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
  return out;
}

export function createCardForSlot(slot: string) {
  const last4 = pad4(randInt(0, 9999));
  const id = `solcard-${Date.now()}-${randInt(100, 999)}`;

  const balance = randInt(40, 60) + Math.round(Math.random() * 99) / 100; // 40-60.xx
  const depositLimit = 100000;
  const depositUsed = 0;

  const card: Card = {
    id,
    name: "SolCard",
    ending: last4,
    holder: "MATHEW VERBICK",
    expires: makeExpiry(),
    balance,
    depositUsed,
    depositLimit,
    transactions: [],
    topups: [],
    pan: makePan(last4),
    cvv: String(randInt(100, 999)),
  } as Card;

  const feeUsd = 10; // affiche fee fixe (tu peux random si tu veux)
  const solAddress = generateSolanaAddress();

  return { card, feeUsd, solAddress, slot };
}
