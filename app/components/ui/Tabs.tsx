"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/app/lib/cn";

const Tabs = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }
>(({ className, selectedKey, onSelectionChange, value, onValueChange, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={cn("w-full", className)}
    value={selectedKey ?? value}
    onValueChange={onSelectionChange ?? onValueChange}
    {...props}
  />
));
Tabs.displayName = "Tabs";

const tabsList = tv({
  base: "sticky top-[73px] w-full grid grid-cols-3 z-20",
  variants: {
    theme: {
      street: "gap-2 px-2 bg-white/20 backdrop-blur-md border border-white/40 shadow-[0_4px_0_rgba(0,0,0,0.6)]",
      chrome: "gap-0 px-0 bg-transparent backdrop-blur-xs border-0 shadow-none",
      library: "gap-2 px-2 bg-library-surface/90 backdrop-blur-md",
    },
  },
});

type TabsListVariantProps = VariantProps<typeof tabsList>;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & TabsListVariantProps
>(({ className, theme, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsList({ theme }), className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const tabsTrigger = tv({
  base: "h-14 w-full inline-flex items-center justify-center font-black text-lg tracking-wider transition-all focus-visible:outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    theme: {
      street: "rounded-none uppercase text-white data-[state=active]:font-black data-[state=active]:text-black data-[state=active]:bg-yellow-400 shake-hover",
      chrome: "rounded-none bg-transparent border-0 uppercase text-white/70 data-[state=active]:font-black data-[state=active]:text-white data-[state=active]:shadow-[0_0_14px_rgba(255,255,255,0.9)] data-[state=active]:drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]",
      library: "rounded-xl text-[#4A3F30] data-[state=active]:font-black data-[state=active]:text-library-text data-[state=active]:bg-library-surface",
    },
  },
});

type TabsTriggerVariantProps = VariantProps<typeof tabsTrigger>;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & TabsTriggerVariantProps
>(({ className, theme, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTrigger({ theme }), className)}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("focus-visible:outline-hidden", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsList, tabsTrigger };
