export function DottedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#0b0f14] text-white">
      {/* points */}
      <div className="pointer-events-none absolute inset-0 opacity-60 dots-layer" />

      {/* glow hover */}
      <div className="pointer-events-none absolute inset-0 dots-glow-layer" />

      <div className="relative">{children}</div>
    </div>
  );
}
