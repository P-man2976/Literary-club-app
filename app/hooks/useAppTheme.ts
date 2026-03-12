"use client";

import { useTheme } from "next-themes";

export type AppTheme = "street" | "chrome" | "library";

/**
 * next-themes の resolvedTheme を street / chrome / library に正規化して返す。
 * tailwind-variants の theme variant にそのまま渡せる。
 */
export function useAppTheme() {
  const { resolvedTheme, theme, setTheme } = useTheme();

  // next-themes のテーマ名 → AppTheme の正規化
  const appTheme: AppTheme =
    resolvedTheme === "dark"
      ? "chrome"
      : resolvedTheme === "library"
        ? "library"
        : "street";

  const isChromeTheme = appTheme === "chrome";
  const isLibraryTheme = appTheme === "library";
  const isStreetTheme = appTheme === "street";

  return {
    appTheme,
    isChromeTheme,
    isLibraryTheme,
    isStreetTheme,
    /** next-themes の生値 */
    resolvedTheme,
    theme,
    setTheme,
  };
}
