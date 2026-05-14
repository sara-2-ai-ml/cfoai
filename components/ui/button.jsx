import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-white text-[#09090B] hover:bg-white/90 shadow-sm",
        accent: "bg-accent text-black hover:bg-accent/85",
        secondary: "bg-white/[0.06] text-white/80 border border-white/[0.08] hover:bg-white/[0.1] hover:text-white",
        ghost: "text-white/50 hover:text-white hover:bg-white/[0.06]",
        destructive: "bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-6",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export function Button({ className, variant, size, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
