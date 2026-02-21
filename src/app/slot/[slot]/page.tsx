import { DottedBackground } from "@/components/ui/background";
import { TopNav } from "@/components/top-nav";
import EmptySlotView from "./view";

export default function SlotPage({ params }: { params: { slot: string } }) {
  return (
    <DottedBackground>
      <TopNav />
      <EmptySlotView slot={params.slot} />
    </DottedBackground>
  );
}
