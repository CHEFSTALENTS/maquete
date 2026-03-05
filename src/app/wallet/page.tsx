"use client";

import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { SlotGrid } from "@/components/slot-grid";

export default function WalletPage() {
  return (
    <DottedBackground>
      <TopNav />

      <div className="px-10 pb-16">
        {/* top tabs (My Wallet / Referrals) — si ton TopNav gère déjà, tu peux enlever */}
        <div className="mt-6 flex items-center justify-center gap-10 text-sm text-white/70">
          <div className="text-white/85 font-semibold">My Wallet</div>
          <div className="hover:text-white/85 transition cursor-pointer">Referrals</div>
        </div>

        {/* title */}
        <h1 className="mt-6 text-center text-4xl font-semibold tracking-tight text-white/90">
          My Wallet
        </h1>

        {/* grid area */}
        <div className="mt-10 flex justify-center">
          {/* largeur proche de ta capture : large, mais pas full */}
          <div className="w-full max-w-[1180px]">
            <SlotGrid />
          </div>
        </div>
      </div>
    </DottedBackground>
  );
}
