"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const button = tv({
  base: "inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  variants: {
    variant: {
      default: "",
      flat: "",
      light: "",
      ghost: "",
    },
    color: {
      default: "",
      primary: "",
      danger: "",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-base",
      lg: "h-12 px-6 text-lg",
    },
    isIconOnly: {
      true: "p-0 aspect-square",
    },
    fullWidth: {
      true: "w-full",
    },
    theme: {
      street: "border-3 border-black",
      chrome: "border border-[#bcbcbc] bg-[#0d0d0f] text-[#f8f8f8] rounded-none",
      library: "rounded-xl",
    },
  },
  compoundVariants: [
    // Default variant + colors
    {
      variant: "default",
      color: "default",
      class: "bg-gray-200 text-black hover:bg-gray-300 active:bg-gray-400",
    },
    {
      variant: "default",
      color: "primary",
      class: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    },
    {
      variant: "default",
      color: "danger",
      class: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
    },
    // Flat variant + colors
    {
      variant: "flat",
      color: "default",
      class: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    },
    {
      variant: "flat",
      color: "primary",
      class: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    },
    {
      variant: "flat",
      color: "danger",
      class: "bg-red-50 text-red-600 hover:bg-red-100",
    },
    // Light variant + colors
    {
      variant: "light",
      color: "default",
      class: "bg-transparent text-gray-700 hover:bg-gray-100",
    },
    {
      variant: "light",
      color: "primary",
      class: "bg-transparent text-blue-600 hover:bg-blue-50",
    },
    {
      variant: "light",
      color: "danger",
      class: "bg-transparent text-red-600 hover:bg-red-50",
    },
    // Ghost variant + colors
    {
      variant: "ghost",
      color: "default",
      class: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100",
    },
    // Size for icon-only
    {
      isIconOnly: true,
      size: "sm",
      class: "h-8 w-8",
    },
    {
      isIconOnly: true,
      size: "md",
      class: "h-10 w-10",
    },
    {
      isIconOnly: true,
      size: "lg",
      class: "h-12 w-12",
    },
  ],
  defaultVariants: {
    variant: "default",
    color: "default",
    size: "md",
  },
});

type ButtonVariantProps = VariantProps<typeof button>;

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    ButtonVariantProps {
  asChild?: boolean;
  onPress?: () => void;
  isDisabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      color,
      size,
      isIconOnly,
      fullWidth,
      theme,
      asChild = false,
      onPress,
      isDisabled,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isActuallyDisabled = isDisabled ?? disabled;
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onPress?.();
    };

    return (
      <Comp
        className={cn(
          button({ variant, color, size, isIconOnly, fullWidth, theme }),
          className,
        )}
        ref={ref}
        disabled={isActuallyDisabled}
        onClick={handleClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, button };
export type { ButtonProps };
