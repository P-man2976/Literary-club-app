"use client";

import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const chip = tv({
  base: "inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap",
  variants: {
    size: {
      sm: "h-5 px-2 text-xs",
      md: "h-6 px-3 text-sm",
      lg: "h-8 px-4 text-base",
    },
    theme: {
      street: "",
      chrome: "border border-[#bcbcbc] bg-[#0a0a0b] text-white rounded-none",
      library: "bg-[#E7E0D0] text-[#3F3427] font-bold",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type ChipVariantProps = VariantProps<typeof chip>;

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement>, ChipVariantProps {}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, size, theme, children, ...props }, ref) => {
    return (
      <span className={cn(chip({ size, theme }), className)} ref={ref} {...props}>
        {children}
      </span>
    );
  },
);
Chip.displayName = "Chip";

export { Chip, chip };
