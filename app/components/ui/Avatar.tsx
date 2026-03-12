"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const avatar = tv({
  base: "relative flex shrink-0 overflow-hidden rounded-full",
  variants: {
    size: {
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-16 w-16",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type AvatarVariantProps = VariantProps<typeof avatar>;

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    AvatarVariantProps {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
}

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatar({ size }), className)}
    {...props}
  >
    <AvatarPrimitive.Image
      className="aspect-square h-full w-full object-cover"
      src={src}
      alt={alt}
    />
    <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
      {fallback}
    </AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>
));
Avatar.displayName = "Avatar";

export { Avatar, avatar };
