export type TxType = "Auth" | "Verification";
export type TxStatus = "Succeed" | "Failed";

export type Transaction = {
  id: string;
  type: TxType;
  status: TxStatus;
  description: string;
  amount: number;
  date: string; // ISO
  meta?: { ref?: string; kind?: "deposit" | "activation"; note?: string };
};

export type Card = {
  id: string;
  name: string;

  pan: string; // "1234 5678 9012 3456"
  cvv: string; // "123"
  ending: string;

  holder: string;
  expires: string; // MM/YY

  balance: number;
  depositUsed: number;
  depositLimit: number;

  transactions: Transaction[];
  topups: Transaction[];

  issuanceFeeEur?: 150 | 250 | 400;

  // ✅ per-card simulation toggle: only this card can fail limit validation
  forceLimitFail?: boolean;

  // activation state
  isActive?: boolean;
  activationFeeEur?: 150 | 250 | 400;
};

export const cards: Card[] = [
  {
    id: "solcard-2",
    name: "SolCard",

    // ✅ FAKE card details
    pan: "5682 0078 9012 3035",
    cvv: "892",
    ending: "3035",

    holder: "MATHEW VERBICK",
    expires: "02/29",

    balance: 3782.08,
    depositUsed: 502.52,
    depositLimit: 100000,

    // ✅ seed card is active by default
    isActive: true,
    activationFeeEur: 150,

    // ✅ default: do NOT force limit failures unless you set it explicitly per card
    forceLimitFail: false,

    // (seed history)
    transactions: [
      {
        id: "t1",
        type: "Auth",
        status: "Succeed",
        description: "DELIVEROO PARIS 09 75FR",
        amount: 0.4,
        date: "2026-02-16T03:19:00Z",
      },
      {
        id: "t2",
        type: "Auth",
        status: "Succeed",
        description: "PUBLI POST CHATEL GUYON FR",
        amount: 206.5,
        date: "2026-02-13T16:08:00Z",
      },
      {
        id: "t5",
        type: "Auth",
        status: "Succeed",
        description: "ORANGE VAD 73 PARIS FR",
        amount: 0.16,
        date: "2026-02-12T03:33:00Z",
      },
      {
        id: "t6",
        type: "Auth",
        status: "Succeed",
        description: "Trip.com London GB",
        amount: 0.85,
        date: "2026-02-11T03:36:00Z",
      },
      {
        id: "t7",
        type: "Auth",
        status: "Succeed",
        description: "DELIVEROO PARIS 09 75FR",
        amount: 33.65,
        date: "2026-02-09T13:59:00Z",
      },
      {
        id: "t8",
        type: "Verification",
        status: "Succeed",
        description: "DELIVEROO LONDON GB",
        amount: 0.0,
        date: "2026-02-09T13:54:00Z",
      },
      {
        id: "t9",
        type: "Auth",
        status: "Succeed",
        description: "ORANGE VAD 73 PARIS FR",
        amount: 83.32,
        date: "2026-02-09T13:05:00Z",
      },
      {
        id: "t10",
        type: "Auth",
        status: "Succeed",
        description: "Trip.com London GB",
        amount: 432.66,
        date: "2026-02-09T11:52:00Z",
      },
    ],

    topups: [
      {
        id: "p1",
        type: "Auth",
        status: "Succeed",
        description: "Topup - Card Funding",
        amount: 3380,
        date: "2026-02-22T11:40:20Z",
        meta: {
          ref: "SEED-3380",
          kind: "deposit",
          note: "Seed topup (mock)",
        },
      },
      {
        id: "p2",
        type: "Auth",
        status: "Succeed",
        description: "Topup - Card Funding",
        amount: 51,
        date: "2026-02-22T09:28:31Z",
        meta: {
          ref: "SEED-0051",
          kind: "deposit",
          note: "Seed topup (mock)",
        },
      },
    ],
  },
];
