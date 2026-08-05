import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border border-white/72 bg-white/43 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-[14px]",
  {
    variants: {
      variant: {
        default: "text-slate-600",
        primary: "bg-blue-600/10 text-blue-700 border-blue-200/50",
        success: "bg-emerald-50/80 text-emerald-700 border-emerald-200/50",
        warning: "bg-amber-50/80 text-amber-700 border-amber-200/50",
        destructive: "bg-rose-50/80 text-rose-700 border-rose-200/50",
        outline: "text-slate-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
