import { cn } from "@/lib/utils";

export function Shell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}
