export type TxStatus = "Succeed" | "Failed";
export type TxType = "Auth" | "Topup";

export type Transaction = {
  id: string;
  type: TxType;
  status: TxStatus;
  description: string;
  amount: number;
  date?: string;     // ISO
  dateIso?: string;  // ISO (tu utilises parfois ce champ)
  meta?: {
    ref?: string;
    note?: string;
  };
};

export type Card = {
  id: string;
  holder: string;
  ending: string;
  expires: string;

  balance: number;

  // “Your monthly deposit”
  depositLimit: number;
  depositUsed: number;

  // feature flags
  forceLimitFail?: boolean;

  // optional details (si tu veux les masquer/afficher)
  pan?: string;
  cvv?: string;

  transactions?: Transaction[];
};
