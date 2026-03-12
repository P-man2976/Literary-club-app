"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="library" themes={["light", "dark", "library"]} enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
