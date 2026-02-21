import React from "react";

export function DottedBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="sc-bg text-white min-h-screen sc-hover relative overflow-hidden">
      {/* dots layer */}
      <div className="pointer-events-none absolute inset-0 sc-dots" />
      {/* glow dots layer */}
      <div className="pointer-events-none absolute inset-0 sc-dots-glow" />

      {/* contenu */}
      <div className="relative">{children}</div>
    </div>
  );
}
