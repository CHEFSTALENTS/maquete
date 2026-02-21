import Link from "next/link";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "../../../components/top-nav";
import { Shell } from "@/components/ui/card-shell";
import { cards } from "@/lib/mock-data";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";

export default function CardPage({ params }: { params: { id: string } }) {
  const card = cards.find((c) => c.id === params.id) ?? cards[0];
  const pct = Math.round((card.depositUsed / card.depositLimit) * 100);

  return (
    <DottedBackground>
      <TopNav />

      <div className="px-6 pb-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/wallet" className="text-sm opacity-80 hover:opacity-100">
              ← Back
            </Link>
          </div>
          <div className="text-sm opacity-80">{formatMoney(card.balance, "USD")}</div>
        </div>

        <div className="flex items-start justify-center">
          <Shell className="p-6 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm hover:bg-white/15">
                  Deposit
                </button>
                <button className="px-4 py-2 rounded-lg bg-white/0 border border-white/10 text-sm opacity-90 hover:bg-white/5">
                  Withdraw/Transfer
                </button>
                <button className="px-3 py-2 rounded-lg bg-white/0 border border-white/10 text-sm opacity-80 hover:bg-white/5">
                  …
                </button>
              </div>
              <div className="text-sm opacity-70">SolCard</div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <div className="w-[520px] max-w-full rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs opacity-70">Billing</div>
                  <div className="text-xs opacity-60">👁</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/70 to-cyan-400/60 border border-white/10" />
                    <div>
                      <div className="text-sm opacity-70">•••• •••• •••• {card.ending}</div>
                      <div className="mt-3 grid grid-cols-2 gap-6 text-xs opacity-80">
                        <div>
                          <div className="opacity-60">Card Holder</div>
                          <div className="text-base font-semibold">{card.holder}</div>
                        </div>
                        <div>
                          <div className="opacity-60">Expires</div>
                          <div className="text-base font-semibold">{card.expires}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-4">
                    <div className="h-7 w-11 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80" />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs opacity-75 mb-2">
                    <span>{pct}% of your monthly deposit limit used</span>
                    <span>
                      {formatMoney(card.depositUsed, "USD")} / {formatMoney(card.depositLimit, "USD")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-white/40"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Shell className="p-4 w-[720px] max-w-full bg-white/5 border border-white/10">
                <div className="text-sm font-semibold mb-2 text-white/80">
                  Card Usage Rules
                </div>
                <ul className="text-xs leading-5 text-white/65 list-disc pl-5">
                  <li>No crypto-related platforms or usage scenarios</li>
                  <li>No gift card / voucher / gaming sites</li>
                  <li>Some merchants may be blocked depending on risk</li>
                  <li>High decline rates may trigger card cancellation</li>
                </ul>
                <div className="text-xs mt-2 underline opacity-70">Learn more</div>
              </Shell>
            </div>

            <CardTabs cardId={card.id} />
          </Shell>
        </div>
      </div>
    </DottedBackground>
  );
}
