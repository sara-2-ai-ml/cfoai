import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/40 transition-colors",
        className
      )}
      {...props}
    />
  );
}
