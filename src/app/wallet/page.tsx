"use client";

import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { SlotGrid } from "@/components/slot-grid";

export default function WalletPage() {
  return (
    <DottedBackground>
      <TopNav />

      <div className="px-10 pb-16">
        {/* ✅ On NE remet PAS My Wallet / Referrals ici
            (c’est déjà dans l’entête TopNav) */}

        <h1 className="mt-10 text-center text-4xl font-semibold tracking-tight text-white/90">
          My Wallet
        </h1>

        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-[1180px]">
            <SlotGrid />
          </div>
        </div>
      </div>
    </DottedBackground>
  );
}
