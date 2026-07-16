import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#EA580C] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#C2410C] text-white hover:bg-[#EA580C] shadow-lg shadow-orange-900/15 hover:shadow-orange-900/25 hover:scale-[1.03]",
        secondary: "bg-[#F3EBDD] text-[#2A2320] border border-[#E7DBCB] hover:bg-[#EADCC8]",
        outline: "border border-[#C2410C] text-[#C2410C] hover:bg-[#C2410C]/8",
        ghost: "text-[#6B5D52] hover:bg-[#F3EBDD] hover:text-[#2A2320]",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-5 py-2",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
