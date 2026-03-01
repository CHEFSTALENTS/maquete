import type { Card, Transaction } from "@/lib/mock-data";
import { cards as seedCards } from "@/lib/mock-data";

const LS_KEY = "solcard_mock_cards_v1";
const LS_USED_HOLDERS_KEY = "solcard_mock_used_holders_v1";

// ✅ keep your existing type
export type FeeEur = 150 | 250 | 400;

// ✅ alias for older imports in slot/view.tsx
export type ActivationFeeEur = FeeEur;

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

/* ---------------------------------------------
   ✅ Unique + international holder names
---------------------------------------------- */

type NamePool = {
  first: string[];
  last: string[];
  // optional second-last name for cultures where common
  last2?: string[];
  // weight used for distribution
  weight: number;
};

const NAME_POOLS: NamePool[] = [
  // France (dominant)
  {
    weight: 22,
    first: [
      "Louis","Gabriel","Arthur","Jules","Hugo","Raphael","Nathan","Lucas","Leo","Adam",
      "Emma","Lina","Chloe","Jade","Louise","Camille","Manon","Sarah","Lea","Ines",
      "Maxime","Antoine","Paul","Mathis","Ethan",
    ],
    last: [
      "Martin","Bernard","Thomas","Petit","Robert","Richard","Durand","Dubois","Moreau","Laurent",
      "Simon","Michel","Lefevre","Garcia","Roux","Fournier","Girard","Lambert","Fontaine","Chevalier",
      "Masson","Dupont",
    ],
  },

  // UK / Ireland
  {
    weight: 10,
    first: ["James","William","Harry","George","Oliver","Jack","Noah","Leo","Charlie","Henry","Amelia","Olivia","Emily","Sophia","Grace","Ella"],
    last: ["Smith","Johnson","Brown","Taylor","Wilson","Davies","Evans","Thomas","Roberts","Walker","Wright","Hall","Wood","Thompson"],
  },

  // Espagne
  {
    weight: 10,
    first: ["Sofia","Lucia","Martina","Paula","Carmen","Mateo","Hugo","Leo","Daniel","Alejandro","Carlos","Diego","Santiago"],
    last: ["Garcia","Martinez","Rodriguez","Lopez","Gonzalez","Sanchez","Ramirez","Torres","Flores","Vargas"],
    last2: ["Diaz","Hernandez","Alvarez","Moreno","Navarro","Rojas"],
  },

  // Italie
  {
    weight: 9,
    first: ["Giulia","Sofia","Chiara","Francesca","Martina","Lorenzo","Matteo","Leonardo","Andrea","Marco","Giuseppe","Federico"],
    last: ["Rossi","Russo","Ferrari","Esposito","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Conti"],
  },

  // Portugal
  {
    weight: 6,
    first: ["Joao","Tiago","Miguel","Rafael","Goncalo","Ines","Beatriz","Mariana","Carolina","Sofia"],
    last: ["Silva","Santos","Ferreira","Pereira","Costa","Oliveira","Ribeiro","Carvalho"],
    last2: ["Almeida","Sousa","Rodrigues","Martins"],
  },

  // Allemagne / Autriche / Suisse alémanique
  {
    weight: 7,
    first: ["Lukas","Leon","Finn","Noah","Paul","Felix","Emilia","Mia","Hannah","Lea","Sophia","Lena"],
    last: ["Muller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Hoffmann","Schulz","Koch"],
  },

  // Benelux (NL/BE)
  {
    weight: 6,
    first: ["Daan","Sem","Milan","Bram","Liam","Noah","Emma","Sanne","Lotte","Julia","Mila"],
    last: ["De Vries","Van Dijk","Bakker","Jansen","Visser","Smit","Van den Berg","Peeters","Janssens","Willems"],
  },

  // Scandinavie (SE/NO/DK/FI) – léger
  {
    weight: 5,
    first: ["Oscar","Elias","Noah","William","Lucas","Maja","Ella","Alma","Freja","Ida","Sofia"],
    last: ["Johansson","Andersen","Nielsen","Hansen","Larsen","Karlsson","Svensson","Olsen","Lindberg","Eriksson"],
  },

  // Europe de l’Est (PL/CZ/RO/HU) – léger
  {
    weight: 5,
    first: ["Jakub","Jan","Mateusz","Tomasz","Pavel","Andrei","Marek","Anna","Klara","Zofia","Elena","Ivana"],
    last: ["Nowak","Kowalski","Novak","Dvorak","Popescu","Ionescu","Horvat","Kovac","Nagy","Szabo"],
  },

  // ✅ petite touche "international" très rare (pour ne pas être 100% Europe)
  {
    weight: 1,
    first: ["Omar","Youssef","Mariam","Nour","Karim","Amina"],
    last: ["Haddad","Nasser","Mansouri","Benali","Farah","Said"],
  },
];

function weightedPickPool(): NamePool {
  const total = NAME_POOLS.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of NAME_POOLS) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return NAME_POOLS[0];
}

function readUsedHolders(): Set<string> {
  const used = new Set<string>();

  // 1) names already in seed + existing cards
  try {
    for (const c of seedCards) if (c?.holder) used.add(String(c.holder).toUpperCase().trim());
  } catch {}

  // 2) persisted used registry
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(LS_USED_HOLDERS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const v of arr) if (typeof v === "string") used.add(v.toUpperCase().trim());
        }
      }
    } catch {}
  }

  // 3) current cards store
  try {
    const current = loadCards();
    for (const c of current) if (c?.holder) used.add(String(c.holder).toUpperCase().trim());
  } catch {}

  return used;
}

function persistUsedHolder(nameUpper: string) {
  if (typeof window === "undefined") return;
  try {
    const used = readUsedHolders();
    used.add(nameUpper);
    window.localStorage.setItem(LS_USED_HOLDERS_KEY, JSON.stringify(Array.from(used)));
  } catch {
    // ignore
  }
}

function makeCandidateName(): string {
  const pool = weightedPickPool();
  const first = pool.first[randInt(0, pool.first.length - 1)];
  const last = pool.last[randInt(0, pool.last.length - 1)];

  // 30% chance to add second surname if available (for realism)
  const useSecond = !!pool.last2 && Math.random() < 0.3;
  const lastPart = useSecond
    ? `${last} ${pool.last2![randInt(0, pool.last2!.length - 1)]}`
    : last;

  return `${first} ${lastPart}`.toUpperCase().replace(/\s+/g, " ").trim();
}

function generateUniqueHolderName(): string {
  const used = readUsedHolders();

  // try lots of combinations
  for (let i = 0; i < 300; i++) {
    const cand = makeCandidateName();
    if (!used.has(cand)) {
      persistUsedHolder(cand);
      return cand;
    }
  }

  // Fallback (should never happen): add middle initial to keep it human-looking
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < 300; i++) {
    const candBase = makeCandidateName();
    const mid = letters[randInt(0, letters.length - 1)];
    const cand = candBase.replace(" ", ` ${mid}. `).replace(/\s+/g, " ").trim();
    if (!used.has(cand)) {
      persistUsedHolder(cand);
      return cand;
    }
  }

  // ultimate fallback
  const fallback = `CARD HOLDER ${Date.now().toString().slice(-6)}`.toUpperCase();
  persistUsedHolder(fallback);
  return fallback;
}

/* ---------------------------------------------
   Storage
---------------------------------------------- */

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

export function pickFeeEuro(): FeeEur {
  const fees = [150, 250, 400] as const;
  return fees[randInt(0, fees.length - 1)];
}

function makeTopup(args: {
  amount: number;
  status: "Succeed" | "Failed";
  ref: string; // always for clickable rows
  note?: string;
}): Transaction {
  return {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Auth",
    status: args.status,
    description: args.status === "Succeed" ? "Topup - Card Funding" : "Topup failed",
    amount: Number(args.amount.toFixed(2)),
    date: nowIso(),
    meta: { ref: args.ref, kind: "deposit", note: args.note },
  };
}

/**
 * Draft card generation (slot flow)
 * - transactions empty
 * - topups empty
 * - not active yet
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

    // ✅ NEW: unique international holder name
    holder: generateUniqueHolderName(),
    expires: makeExpiry(),

    balance: 0,
    depositUsed: 0,
    depositLimit: 100000,

    transactions: [], // ✅ new card = zero transactions
    topups: [],

    isActive: false,
    activationFeeEur: undefined,
    forceLimitFail: false,
  };

  const solAddress = generateSolanaAddress();
  return { card, solAddress, slot };
}

/**
 * Activate card (ALWAYS succeeds):
 * - initial balance 40..60
 * - initial topup created
 * - transactions stay empty
 */
export function activateCard(cards: Card[], cardId: string, feeEur: FeeEur): Card[] {
  const initial = randInt(40, 60);
  const ref = `ACT-${Date.now().toString().slice(-6)}-${randInt(100, 999)}`;

  const activationTopup: Transaction = {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Auth",
    status: "Succeed",
    description: "Topup - Card Funding",
    amount: Number(initial.toFixed(2)),
    date: nowIso(),
    meta: { ref, kind: "activation", note: `Activation fee €${feeEur}` },
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
      transactions: [], // ✅ stays empty
      topups: [activationTopup],
    };
  });
}

/**
 * ✅ Per-card toggle: only this card will fail the "limit" validation
 */
export function setCardForceLimitFail(cards: Card[], cardId: string, value: boolean): Card[] {
  return cards.map((c) => (c.id === cardId ? { ...c, forceLimitFail: value } : c));
}

/**
 * Deposit attempt:
 * - always logs a topup row (Succeed or Failed) so it’s visible + clickable
 * - if failed: does NOT change balance
 * - if succeed: adds to balance & depositUsed
 */
export function recordDepositAttempt(
  cards: Card[],
  cardId: string,
  amount: number,
  ok: boolean,
  ref: string
): Card[] {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return cards;

  const topup = makeTopup({
    amount: amt,
    status: ok ? "Succeed" : "Failed",
    ref,
    note: ok ? "Deposit confirmed" : "Limit validation required",
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
export function transferFromMaster(
  cards: Card[],
  masterId: string,
  toId: string,
  amount: number
): { next: Card[]; ref: string; error?: string } {
  // Tu peux reprendre exactement la fonction inline `transferFromMasterLocal`
  // (copier-coller tel quel) et l’exporter ici.
  // Ensuite dans page.tsx tu remplaces `transferFromMasterLocal(...)`
  // par `transferFromMaster(...)`.
  return { next: cards, ref: "", error: "Not implemented" };
}
