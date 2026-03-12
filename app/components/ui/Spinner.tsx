"use client";

import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const spinner = tv({
  base: "animate-spin rounded-full border-2 border-current border-t-transparent",
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-10 w-10",
    },
    color: {
      default: "text-gray-400",
      primary: "text-blue-500",
    },
  },
  defaultVariants: {
    size: "md",
    color: "default",
  },
});

type SpinnerVariantProps = VariantProps<typeof spinner>;

interface SpinnerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">, SpinnerVariantProps {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, color, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(spinner({ size, color }), className)}
      role="status"
      aria-label="読み込み中"
      {...props}
    />
  ),
);
Spinner.displayName = "Spinner";

export { Spinner, spinner };
