export type TxType = "Auth" | "Verification";
export type TxStatus = "Succeed" | "Failed";

export type Transaction = {
  id: string;
  type: TxType;
  status: TxStatus;
  description: string;
  amount: number;
  date: string; // ISO
};

export type Card = {
  id: string;
  name: string;
  ending: string;
  holder: string;
  expires: string; // MM/YY
  balance: number;
  depositUsed: number;
  depositLimit: number;
  transactions: Transaction[];
  topups: Transaction[];

  // ✅ NEW (FAKE / UI ONLY)
  pan: string; // "5682 0078 9012 3035"
  cvv: string; // "892"
};

export const cards: Card[] = [
  {
    id: "solcard-2",
    name: "SolCard",
    ending: "3035",
    holder: "MATHEW VERBICK",
    expires: "02/29",
    balance: 3782.08,
    depositUsed: 502.52,
    depositLimit: 100000,

    // ✅ NEW (FAKE)
    pan: "5682 0078 9012 3035",
    cvv: "892",

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
      },
      {
        id: "p2",
        type: "Auth",
        status: "Succeed",
        description: "Topup - Card Funding",
        amount: 51,
        date: "2026-02-22T09:28:31Z",
      },
    ],
  },
];
