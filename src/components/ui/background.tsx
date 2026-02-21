export function DottedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F16] text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.20) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
