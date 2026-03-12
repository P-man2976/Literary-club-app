"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="library" themes={["street", "chrome", "library"]} enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
