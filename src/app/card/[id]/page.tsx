import Link from "next/link";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { cards } from "@/lib/mock-data";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";

export default function CardPage({ params }: { params: { id: string } }) {
  const card = cards.find((c) => c.id === params.id) ?? cards[0];
  const pct = Math.round((card.depositUsed / card.depositLimit) * 100);

  return (
    <DottedBackground>
      <TopNav />

      <div className="px-6 pb-12 max-w-6xl mx-auto">
        {/* top row */}
        <div className="mt-6 flex items-center justify-between">
          <Link href="/wallet" className="text-sm opacity-80 hover:opacity-100">
            ← Back
          </Link>

          <div className="flex items-center gap-3">
            <button className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition">
              Deposit
            </button>

            <button className="px-5 py-2 rounded-lg bg-white/0 border border-white/10 text-sm hover:bg-white/5 transition">
              Withdraw/Transfer
            </button>

            <button className="px-3 py-2 rounded-lg bg-white/0 border border-white/10 text-sm opacity-80 hover:bg-white/5 transition">
              …
            </button>
          </div>

          <div className="text-sm font-semibold opacity-90">
            {formatMoney(card.balance, "USD")}
          </div>
        </div>

        {/* card display */}
        <div className="mt-8 flex items-center justify-center gap-10">
          <button className="h-9 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center">
            ←
          </button>

          <div className="relative w-full max-w-[720px] aspect-[1.586/1] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="relative h-full p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                    Billing
                  </div>
                  <span className="text-xs opacity-60">👁</span>
                </div>

                <div className="text-2xl font-semibold tracking-wide opacity-90">
                  SolCard
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-fuchsia-500/70 to-cyan-400/60 border border-white/10" />
                  <div>
                    <div className="text-sm opacity-70">
                      •••• •••• •••• {card.ending}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-10 text-xs">
                      <div>
                        <div className="opacity-60">Card Holder</div>
                        <div className="text-base font-semibold">
                          {card.holder}
                        </div>
                      </div>

                      <div>
                        <div className="opacity-60">Expires</div>
                        <div className="text-base font-semibold">
                          {card.expires}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-8 w-12 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80 opacity-95" />
              </div>
            </div>
          </div>

          <button className="h-9 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center">
            →
          </button>
        </div>

        {/* progress line */}
        <div className="mt-7 max-w-[900px] mx-auto">
          <div className="flex items-center justify-between text-sm opacity-80 mb-2">
            <span>{pct}% of your monthly deposit limit used</span>
            <span>
              {formatMoney(card.depositUsed, "USD")} /{" "}
              {formatMoney(card.depositLimit, "USD")}
            </span>
          </div>

          <div className="h-[3px] rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-white/60"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        {/* rules (pink warning) */}
        <div className="mt-6 max-w-[900px] mx-auto">
          <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-rose-200">⚠️</div>
              <div className="w-full">
                <div className="text-sm font-semibold text-rose-50/90 mb-1">
                  Card Usage Rules
                </div>

                <div className="text-xs leading-5 text-rose-50/70">
                  The following usage scenarios are strictly prohibited and will
                  lead to immediate cancellation and fund freezing:
                </div>

                <ul className="mt-2 text-xs leading-5 text-rose-50/70 list-disc pl-5">
                  <li>No crypto-related platforms or usage scenarios</li>
                  <li>No gift card / voucher / gaming sites</li>
                  <li>Some merchants may be blocked depending on risk</li>
                  <li>High decline rates may trigger card cancellation</li>
                </ul>

                <div className="text-xs mt-2 underline text-rose-50/70">
                  Learn more
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* tabs + table */}
        <div className="mt-6 max-w-[900px] mx-auto">
          <CardTabs cardId={card.id} />
        </div>
      </div>
    </DottedBackground>
  );
}
