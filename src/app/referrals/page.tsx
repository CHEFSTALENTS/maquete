import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { Shell } from "@/components/ui/card-shell";

export default function ReferralsPage() {
  return (
    <DottedBackground>
      <TopNav />
      <div className="px-6 pb-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-center">Referrals</h1>
        <Shell className="p-6">
          <div className="opacity-70 text-sm">
            Placeholder referrals page (for the demo flow).
          </div>
        </Shell>
      </div>
    </DottedBackground>
  );
}
