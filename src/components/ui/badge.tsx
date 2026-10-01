import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-indigo-800/30 bg-indigo-950/40 text-indigo-400',
        secondary: 'border-slate-800/30 bg-slate-900/40 text-slate-400',
        destructive: 'border-red-800/30 bg-red-950/40 text-red-400',
        success: 'border-emerald-800/30 bg-emerald-950/40 text-emerald-400',
        warning: 'border-amber-800/30 bg-amber-950/40 text-amber-400',
        outline: 'border-slate-700 text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
