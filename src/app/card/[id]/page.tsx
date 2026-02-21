import Link from "next/link";
import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { cards } from "@/lib/mock-data";
import { formatMoney } from "@/lib/utils";
import CardTabs from "./tabs";

export default function CardPage({ params }: { params: { id: string } }) {
  const card = cards.find((c) => c.id === params.id) ?? cards[0];

  const pctRaw = (card.depositUsed / card.depositLimit) * 100;
  const pct = Number.isFinite(pctRaw) ? Math.round(pctRaw) : 0;

  return (
    <DottedBackground>
      <TopNav />

      <div className="px-6 pb-14 max-w-6xl mx-auto">
        {/* top row: back + actions + balance */}
        <div className="pt-8 flex items-center justify-between">
          <Link
            href="/wallet"
            className="text-sm opacity-70 hover:opacity-100 transition"
          >
            ← Back
          </Link>

          <div className="flex items-center gap-3">
            <button className="h-10 px-5 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition">
              Deposit
            </button>

            <button className="h-10 px-5 rounded-lg bg-white/0 border border-white/15 text-sm hover:bg-white/5 transition">
              Withdraw/Transfer
            </button>

            <button className="h-10 w-10 rounded-lg bg-white/0 border border-white/15 text-sm hover:bg-white/5 transition">
              …
            </button>
          </div>

          <div className="text-sm font-semibold opacity-90">
            {formatMoney(card.balance, "USD")}
          </div>
        </div>

        {/* card + arrows */}
        <div className="mt-8 flex items-center justify-center gap-10">
          <button
            aria-label="Previous"
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
          >
            ←
          </button>

          {/* CARD (smaller, like SolCard) */}
          <div className="relative w-full max-w-[640px]">
            <div className="relative aspect-[1.75/1] rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
              {/* subtle dots inside card */}
              <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />
              {/* soft vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0)_55%)]" />

              <div className="relative p-6 h-full">
                {/* top row in card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs">
                      Billing
                    </span>
                    <span className="text-xs opacity-70">👁</span>
                  </div>

                  <div className="text-lg font-semibold tracking-wide opacity-90">
                    SolCard
                  </div>
                </div>

                {/* middle: chip + number */}
                <div className="mt-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/70 to-cyan-400/60 border border-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="text-lg tracking-[0.35em] opacity-70">
                      ••••
                    </span>
                    <span className="text-lg tracking-[0.35em] opacity-70">
                      ••••
                    </span>
                    <span className="text-lg tracking-[0.35em] opacity-70">
                      ••••
                    </span>
                    {/* last 4 big + “floating” */}
                    <span className="ml-2 text-2xl font-semibold tracking-wider">
                      {card.ending}
                    </span>
                  </div>
                </div>

                {/* bottom row */}
                <div className="mt-6 flex items-end justify-between">
                  <div className="grid grid-cols-2 gap-10">
                    <div>
                      <div className="text-xs opacity-60">Card Holder</div>
                      <div className="text-base font-semibold uppercase tracking-wide">
                        {card.holder}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs opacity-60">Expires</div>
                      <div className="text-base font-semibold">{card.expires}</div>
                    </div>
                  </div>

                  {/* mastercard */}
                  <div className="flex items-center">
                    <div className="relative h-9 w-14">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-yellow-400/80" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-orange-500/80" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            aria-label="Next"
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
          >
            →
          </button>
        </div>

        {/* progress line */}
        <div className="mt-8 max-w-[820px] mx-auto">
          <div className="flex items-center justify-between text-sm opacity-85 mb-2">
            <div>{pct}% of your monthly deposit limit used</div>
            <div>
              {formatMoney(card.depositUsed, "USD")} /{" "}
              {formatMoney(card.depositLimit, "USD")}
            </div>
          </div>

          <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/60"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>

        {/* rules (pink-ish like SolCard) */}
        <div className="mt-6 max-w-[820px] mx-auto">
          <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-rose-200">⚠</span>
              <div className="text-sm font-semibold text-rose-100">
                Card Usage Rules
              </div>
            </div>

            <ul className="text-xs leading-5 text-rose-100/80 list-disc pl-5">
              <li>No crypto-related platforms or usage scenarios</li>
              <li>No gift card / voucher / gaming sites</li>
              <li>Some merchants may be blocked depending on risk</li>
              <li>High decline rates may trigger card cancellation</li>
            </ul>

            <div className="text-xs mt-2 underline text-rose-100/70">
              Learn more
            </div>
          </div>
        </div>

        {/* tabs + table */}
        <div className="mt-6 max-w-[980px] mx-auto">
          <CardTabs cardId={card.id} />
        </div>
      </div>
    </DottedBackground>
  );
}
