import type { Card, Transaction, TxStatus, TxType } from "@/lib/types";

// ✅ seedCards fallback (mock-data supprimé)
// On garde une liste vide pour ne rien "précharger" et juste éviter l'erreur TS.
const seedCards: Card[] = [];

const LS_KEY = "solcard_mock_cards_v1";
const LS_USED_HOLDERS_KEY = "solcard_mock_used_holders_v1";

// ✅ keep your existing type
export type FeeEur = 150 | 250 | 400;

// ✅ alias for older imports in slot/view.tsx
export type ActivationFeeEur = FeeEur;

/**
 * ⚠️ Certains écrans de ta maquette utilisent des champs "extra"
 * (name, isActive, activationFeeEur). Ils ne sont pas dans Card.
 * On les garde optionnels en stockage sans casser les types publics.
 */
type StoredCard = Card & {
  name?: string;
  isActive?: boolean;
  activationFeeEur?: FeeEur;
};

/* ---------------------------------------------
   Utils
---------------------------------------------- */

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
  last2?: string[];
  weight: number;
};

const NAME_POOLS: NamePool[] = [
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
  {
    weight: 10,
    first: ["James","William","Harry","George","Oliver","Jack","Noah","Leo","Charlie","Henry","Amelia","Olivia","Emily","Sophia","Grace","Ella"],
    last: ["Smith","Johnson","Brown","Taylor","Wilson","Davies","Evans","Thomas","Roberts","Walker","Wright","Hall","Wood","Thompson"],
  },
  {
    weight: 10,
    first: ["Sofia","Lucia","Martina","Paula","Carmen","Mateo","Hugo","Leo","Daniel","Alejandro","Carlos","Diego","Santiago"],
    last: ["Garcia","Martinez","Rodriguez","Lopez","Gonzalez","Sanchez","Ramirez","Torres","Flores","Vargas"],
    last2: ["Diaz","Hernandez","Alvarez","Moreno","Navarro","Rojas"],
  },
  {
    weight: 9,
    first: ["Giulia","Sofia","Chiara","Francesca","Martina","Lorenzo","Matteo","Leonardo","Andrea","Marco","Giuseppe","Federico"],
    last: ["Rossi","Russo","Ferrari","Esposito","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Conti"],
  },
  {
    weight: 6,
    first: ["Joao","Tiago","Miguel","Rafael","Goncalo","Ines","Beatriz","Mariana","Carolina","Sofia"],
    last: ["Silva","Santos","Ferreira","Pereira","Costa","Oliveira","Ribeiro","Carvalho"],
    last2: ["Almeida","Sousa","Rodrigues","Martins"],
  },
  {
    weight: 7,
    first: ["Lukas","Leon","Finn","Noah","Paul","Felix","Emilia","Mia","Hannah","Lea","Sophia","Lena"],
    last: ["Muller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Hoffmann","Schulz","Koch"],
  },
  {
    weight: 6,
    first: ["Daan","Sem","Milan","Bram","Liam","Noah","Emma","Sanne","Lotte","Julia","Mila"],
    last: ["De Vries","Van Dijk","Bakker","Jansen","Visser","Smit","Van den Berg","Peeters","Janssens","Willems"],
  },
  {
    weight: 5,
    first: ["Oscar","Elias","Noah","William","Lucas","Maja","Ella","Alma","Freja","Ida","Sofia"],
    last: ["Johansson","Andersen","Nielsen","Hansen","Larsen","Karlsson","Svensson","Olsen","Lindberg","Eriksson"],
  },
  {
    weight: 5,
    first: ["Jakub","Jan","Mateusz","Tomasz","Pavel","Andrei","Marek","Anna","Klara","Zofia","Elena","Ivana"],
    last: ["Nowak","Kowalski","Novak","Dvorak","Popescu","Ionescu","Horvat","Kovac","Nagy","Szabo"],
  },
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

  // 1) names already in seed
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

  const useSecond = !!pool.last2 && Math.random() < 0.3;
  const lastPart = useSecond
    ? `${last} ${pool.last2![randInt(0, pool.last2!.length - 1)]}`
    : last;

  return `${first} ${lastPart}`.toUpperCase().replace(/\s+/g, " ").trim();
}

function generateUniqueHolderName(): string {
  const used = readUsedHolders();

  for (let i = 0; i < 300; i++) {
    const cand = makeCandidateName();
    if (!used.has(cand)) {
      persistUsedHolder(cand);
      return cand;
    }
  }

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

/* ---------------------------------------------
   Slot helpers (si tes écrans les utilisent)
---------------------------------------------- */

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

/**
 * ✅ Transaction Topup (pour que tes lignes soient cliquables via meta.ref)
 */
function makeTopupTx(args: {
  amount: number;
  status: TxStatus;
  ref: string;
  note?: string;
}): Transaction {
  return {
    id: `p-${Date.now()}-${randInt(100, 999)}`,
    type: "Topup",
    status: args.status,
    description: args.status === "Succeed" ? "Topup - Card Funding" : "Topup failed",
    amount: Number(args.amount.toFixed(2)),
    date: nowIso(),
    meta: {
      ref: args.ref,
      note: args.note,
    },
  };
}

/**
 * Draft card generation (slot flow)
 * ✅ On renvoie une Card valide (champs requis),
 * et on peut stocker des champs extra (name/isActive/activationFeeEur) sans casser TS.
 */
export function createDraftCardForSlot(slot: string) {
  const last4 = pad4(randInt(0, 9999));
  const id = `solcard-${Date.now()}-${randInt(100, 999)}`;

  const card: StoredCard = {
    id,
    holder: generateUniqueHolderName(),
    ending: last4,
    expires: makeExpiry(),

    balance: 0,
    depositUsed: 0,
    depositLimit: 100000,

    transactions: [],

    // extras (si tes écrans slot les utilisent)
    name: "SolCard",
    pan: makePan(last4),
    cvv: String(randInt(100, 999)),
    isActive: false,
    activationFeeEur: undefined,
    forceLimitFail: false,
  };

  const solAddress = generateSolanaAddress();
  return { card: card as Card, solAddress, slot };
}

/**
 * Activate card:
 * - initial balance 40..60
 * - ajoute un Topup succeed dans transactions
 */
export function activateCard(cards: Card[], cardId: string, feeEur: FeeEur): Card[] {
  const initial = randInt(40, 60);
  const ref = `ACT-${Date.now().toString().slice(-6)}-${randInt(100, 999)}`;

  const topup = makeTopupTx({
    amount: initial,
    status: "Succeed",
    ref,
    note: `Activation fee €${feeEur}`,
  });

  return (cards as StoredCard[]).map((c) => {
    if (c.id !== cardId) return c;

    // si déjà active, ne pas doubler
    if (c.isActive) return c;

    return {
      ...c,
      isActive: true,
      activationFeeEur: feeEur,
      balance: Number(initial.toFixed(2)),
      depositUsed: Number(initial.toFixed(2)),
      transactions: [topup, ...(c.transactions ?? [])],
    };
  }) as Card[];
}

/* ---------------------------------------------
   Feature flags / deposits / transactions
---------------------------------------------- */

/**
 * ✅ Per-card toggle: only this card will fail the "limit" validation
 */
export function setCardForceLimitFail(cards: Card[], cardId: string, value: boolean): Card[] {
  return (cards as StoredCard[]).map((c) => (c.id === cardId ? { ...c, forceLimitFail: value } : c)) as Card[];
}

/**
 * Deposit attempt:
 * - log une transaction "Topup" (Succeed ou Failed) visible + cliquable (meta.ref)
 * - si Failed: ne change pas le solde
 * - si Succeed: solde + depositUsed augmentent
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

  const topup = makeTopupTx({
    amount: amt,
    status: ok ? "Succeed" : "Failed",
    ref,
    note: ok ? "Deposit confirmed" : "Limit validation required",
  });

  return (cards as StoredCard[]).map((c) => {
    if (c.id !== cardId) return c;

    // on ajoute TOUJOURS la ligne topup
    const nextTx = [topup, ...(c.transactions ?? [])];

    if (!ok) {
      return { ...c, transactions: nextTx };
    }

    const nextBalance = Number(((c.balance ?? 0) + amt).toFixed(2));
    const nextDepositUsed = Number(((c.depositUsed ?? 0) + amt).toFixed(2));

    return {
      ...c,
      balance: nextBalance,
      depositUsed: nextDepositUsed,
      transactions: nextTx,
    };
  }) as Card[];
}

function txId(prefix = "t") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

/**
 * ✅ Ajoute une dépense "Auth" (ou autre type si fourni)
 */
export function addFakeTransactionToCard(
  cards: Card[],
  cardId: string,
  tx: {
    description: string;
    amount: number;
    status?: TxStatus; // "Succeed" | "Failed"
    type?: TxType; // "Auth" | "Topup"
    dateIso?: string; // optionnel
    ref?: string; // optionnel
    note?: string; // optionnel
  }
): Card[] {
  const amt = Number(tx.amount);
  if (!Number.isFinite(amt)) return cards;

  const created: Transaction = {
    id: txId("t"),
    type: tx.type ?? "Auth",
    status: tx.status ?? "Succeed",
    description: tx.description?.trim() || "CARD PURCHASE",
    amount: Number(amt.toFixed(2)),
    date: tx.dateIso ?? new Date().toISOString(),
    meta: tx.ref || tx.note ? { ref: tx.ref, note: tx.note } : undefined,
  };

  return (cards as StoredCard[]).map((c) => {
    if (c.id !== cardId) return c;
    return { ...c, transactions: [created, ...(c.transactions ?? [])] };
  }) as Card[];
}
