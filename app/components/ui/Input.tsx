"use client";

import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const input = tv({
  base: "w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    size: {
      sm: "h-8 text-sm",
      md: "h-10 text-base",
      lg: "h-12 text-lg",
    },
    theme: {
      street: "border-3 border-black",
      chrome: "border border-[#bcbcbc] bg-[#0a0a0b] text-[#f2f2f2] rounded-none placeholder:text-[#d8d8d8]",
      library: "rounded-xl border-0 bg-[#ECE7DB] text-[#1A1A1A] shadow-[inset_2px_2px_5px_rgba(163,141,115,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.5)]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type InputVariantProps = VariantProps<typeof input>;

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">, InputVariantProps {
  onValueChange?: (value: string) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, theme, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <input
        className={cn(input({ size, theme }), className)}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

const textarea = tv({
  base: "w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    theme: {
      street: "border-3 border-black",
      chrome: "border border-[#bcbcbc] bg-[#0a0a0b] text-[#f2f2f2] rounded-none placeholder:text-[#d8d8d8]",
      library: "rounded-xl border-0 bg-[#ECE7DB] text-[#1A1A1A] shadow-[inset_2px_2px_5px_rgba(163,141,115,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.5)]",
    },
  },
});

type TextareaVariantProps = VariantProps<typeof textarea>;

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, TextareaVariantProps {
  onValueChange?: (value: string) => void;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, theme, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    return (
      <textarea
        className={cn(textarea({ theme }), className)}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Input, Textarea, input, textarea };
