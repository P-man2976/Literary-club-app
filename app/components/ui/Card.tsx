"use client";

import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const card = tv({
  slots: {
    base: "rounded-xl overflow-hidden",
    body: "p-4",
  },
  variants: {
    shadow: {
      none: { base: "shadow-none" },
      sm: { base: "shadow-xs" },
      md: { base: "shadow-md" },
    },
    isPressable: {
      true: { base: "cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]" },
    },
    theme: {
      street: {
        base: "jsr-card rounded-xl",
      },
      chrome: {
        base: "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none",
      },
      library: {
        base: "jsr-card bg-white rounded-2xl",
      },
    },
  },
  defaultVariants: {
    shadow: "sm",
  },
});

type CardVariantProps = VariantProps<typeof card>;

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, CardVariantProps {
  onPress?: () => void;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, shadow, isPressable, theme, onPress, onClick, children, ...props }, ref) => {
    const { base } = card({ shadow, isPressable, theme });
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      onPress?.();
    };

    return (
      <div
        className={cn(base(), className)}
        ref={ref}
        onClick={isPressable ? handleClick : onClick}
        role={isPressable ? "button" : undefined}
        tabIndex={isPressable ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    const { body } = card();
    return (
      <div className={cn(body(), className)} ref={ref} {...props}>
        {children}
      </div>
    );
  },
);
CardBody.displayName = "CardBody";

export { Card, CardBody, card };
