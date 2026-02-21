import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import { SlotGrid } from "@/components/slot-grid";

export default function WalletPage() {
  return (
    <DottedBackground>
      <TopNav />
      <SlotGrid />
    </DottedBackground>
  );
}
