import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
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

      <div className="px-6 pb-12 max-w-6xl mx-auto">
        {/* top actions row (like SolCard) */}
        <div className="flex items-center justify-between mt-8 mb-6">
          <div className="flex items-center gap-3">
            <button className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition">
              Deposit
            </button>
            <button className="px-5 py-2 rounded-lg bg-white/0 border border-white/15 text-sm hover:bg-white/5 transition">
              Withdraw/Transfer
            </button>
            <button className="px-3 py-2 rounded-lg bg-white/0 border border-white/15 text-sm opacity-80 hover:opacity-100 hover:bg-white/5 transition">
              …
            </button>
          </div>

          <div className="text-xl font-semibold">{formatMoney(card.balance, "USD")}</div>
        </div>

        {/* main panel */}
        <div className="flex items-center justify-center">
          <Shell className="w-full max-w-[980px] p-6 sc-glass">
            {/* top label right (SolCard) */}
            <div className="flex justify-end mb-3">
              <div className="text-sm opacity-70">SolCard</div>
            </div>

            {/* slot card panel + arrows */}
            <div className="flex items-center justify-center gap-10">
              <button className="h-9 w-12 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition flex items-center justify-center">
                ←
              </button>

              {/* "slot" look */}
              <div className="relative w-full max-w-[720px] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                {/* dotted overlay inside */}
                <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />

                <div className="relative p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs opacity-70 flex items-center gap-2">
                      Billing <span className="opacity-60">👁</span>
                    </div>
                    <div className="text-xs opacity-60" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/70 to-cyan-400/60 border border-white/10" />
                      <div>
                        <div className="text-sm opacity-75">•••• •••• •••• {card.ending}</div>

                        <div className="mt-4 grid grid-cols-2 gap-10 text-xs opacity-85">
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

                    {/* mastercard-ish */}
                    <div className="h-7 w-11 rounded-full bg-gradient-to-r from-orange-500/80 to-yellow-400/80 opacity-90" />
                  </div>

                  {/* thin limit line in same panel (like photo 1) */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs opacity-80 mb-2">
                      <span>{pct}% of your monthly deposit limit used</span>
                      <span>
                        {formatMoney(card.depositUsed, "USD")} / {formatMoney(card.depositLimit, "USD")}
                      </span>
                    </div>
                    <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-white/50"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button className="h-9 w-12 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition flex items-center justify-center">
                →
              </button>
            </div>

            {/* Card Usage Rules (dark card like SolCard) */}
            <div className="mt-6 flex justify-center">
              <Shell className="p-5 w-full max-w-[820px] sc-glass border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="opacity-70">⚠️</span>
                  <div className="text-sm font-semibold text-white/80">Card Usage Rules</div>
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

            {/* Tabs + filters + table (SolCard-like) */}
            <CardTabs cardId={card.id} />
          </Shell>
        </div>
      </div>
    </DottedBackground>
  );
}
