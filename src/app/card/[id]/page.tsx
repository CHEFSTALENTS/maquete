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

      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {/* top row: actions LEFT + balance RIGHT */}
        <div className="mt-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="text-sm opacity-70 hover:opacity-100 transition"
            >
              ← Back
            </Link>

            <button className="ml-4 h-10 px-5 rounded-lg bg-white text-black text-sm font-medium shadow hover:opacity-95 transition">
              Deposit
            </button>

            <button className="h-10 px-5 rounded-lg bg-white/0 border border-white/15 text-sm opacity-90 hover:bg-white/5 transition">
              Withdraw/Transfer
            </button>

            <button className="h-10 w-10 rounded-lg bg-white/0 border border-white/15 text-sm opacity-80 hover:bg-white/5 transition">
              …
            </button>
          </div>

          {/* balance pill (NOT dotted) */}
          <div className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center text-sm font-semibold">
            {formatMoney(card.balance, "USD")}
          </div>
        </div>

        {/* card area (NO big outer frame) */}
        <div className="mt-10 flex items-center justify-center gap-10">
          <button
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Previous card"
          >
            ←
          </button>

          {/* CARD (opaque, smaller, real ratio) */}
          <div
            className="
              relative
              w-full
              max-w-[480px]
              aspect-[1.586/1]
              rounded-2xl
              overflow-hidden
              border border-white/10
              bg-[#16181d]
              shadow-[0_10px_40px_rgba(0,0,0,0.6)]
            "
          >
            {/* subtle inner gradient (keeps it premium but opaque) */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/40" />

            {/* top badges */}
            <div className="absolute left-5 top-4 flex items-center gap-3">
              <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-xs">
                Billing
              </div>

              {/* eye-off icon (no emoji) */}
              <svg
                className="w-4 h-4 opacity-60"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.5 10.5a3 3 0 004.2 4.2" />
                <path d="M6.7 6.7C5 8 3.8 9.6 3 12c2 5 7 8 9 8 1.3 0 2.7-.4 4-1" />
                <path d="M17.3 17.3C19 16 20.2 14.4 21 12c-2-5-7-8-9-8-.7 0-1.4.1-2 .3" />
              </svg>
            </div>

            <div className="absolute right-6 top-5 text-xl font-semibold tracking-wide">
              SolCard
            </div>

            {/* chip */}
            <div className="absolute left-6 top-16 h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500/60 to-cyan-400/60 border border-white/10" />

            {/* blurred groups (NOT dots) + last4 big */}
            <div className="absolute left-6 top-[108px] flex items-center gap-4">
              <div className="flex items-center gap-3 text-sm tracking-widest">
                <span className="blur-[6px] opacity-75 select-none">1234</span>
                <span className="blur-[6px] opacity-75 select-none">5678</span>
                <span className="blur-[6px] opacity-75 select-none">9012</span>
              </div>

              <div className="text-3xl font-semibold tracking-wider">
                {card.ending}
              </div>
            </div>

            {/* bottom infos */}
            <div className="absolute left-6 bottom-6 grid grid-cols-2 gap-10">
              <div>
                <div className="text-xs opacity-60">Card Holder</div>
                <div className="text-base font-semibold">{card.holder}</div>
              </div>

              <div>
                <div className="text-xs opacity-60">Expires</div>
                <div className="text-base font-semibold">{card.expires}</div>
              </div>
            </div>

            {/* CVV blurred (visual only) */}
            <div className="absolute right-24 bottom-8 text-xs opacity-70">
              CVV{" "}
              <span className="blur-[6px] opacity-75 select-none">123</span>
            </div>

            {/* mastercard */}
            <div className="absolute right-6 bottom-6">
              <div className="relative h-8 w-14">
                <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-red-500/90" />
                <div className="absolute left-4 top-0 h-8 w-8 rounded-full bg-yellow-400/90 mix-blend-screen" />
              </div>
            </div>
          </div>

          <button
            className="h-10 w-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Next card"
          >
            →
          </button>
        </div>

        {/* usage bar */}
        <div className="mt-8 max-w-[820px] mx-auto">
          <div className="flex items-center justify-between text-sm opacity-85 mb-2">
            <div>{pct}% of your monthly deposit limit used</div>
            <div>
              {formatMoney(card.depositUsed, "USD")} /{" "}
              {formatMoney(card.depositLimit, "USD")}
            </div>
          </div>

          <div className="h-[6px] rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-white/70"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        {/* rules (light, opaque, pink accent) */}
        <div className="mt-6 max-w-[820px] mx-auto">
          <div className="rounded-2xl border border-rose-200/40 bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 font-semibold text-rose-700">
                <span className="text-rose-600">⚠️</span> Card Usage Rules
              </div>

              <div className="mt-2 text-sm text-black/70">
                The following usage scenarios are strictly prohibited and will
                lead to immediate cancellation and fund freezing:
              </div>

              <ul className="mt-3 text-sm text-black/75 list-disc pl-5 space-y-1">
                <li>No crypto-related platforms or usage scenarios</li>
                <li>No gift card / voucher / gaming sites</li>
                <li>Some merchants may be blocked depending on risk</li>
                <li>High decline rates may trigger card cancellation</li>
              </ul>

              <div className="mt-3 text-sm underline text-rose-700">
                Learn more
              </div>
            </div>
          </div>
        </div>

        {/* tabs + table */}
        <div className="mt-6 max-w-[920px] mx-auto">
          <CardTabs cardId={card.id} />
        </div>
      </div>
    </DottedBackground>
  );
}
