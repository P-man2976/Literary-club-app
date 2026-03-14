"use client";

import { useEffect, useRef, useState } from "react";

const PULL_THRESHOLD = 118;
const MAX_PULL_DISTANCE = 185;

export function PullToRefresh() {
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const isTouchCapable =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    if (!isTouchCapable) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (window.scrollY > 0) return;

      startYRef.current = event.touches[0].clientY;
      isPullingRef.current = true;
      setPullDistance(0);
      setIsReady(false);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isPullingRef.current || startYRef.current === null) return;

      const currentY = event.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0 || window.scrollY > 0) {
        setPullDistance(0);
        setIsReady(false);
        return;
      }

      const damped = Math.min(delta * 0.5, MAX_PULL_DISTANCE);
      setPullDistance(damped);
      setIsReady(damped >= PULL_THRESHOLD);
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) return;

      isPullingRef.current = false;
      startYRef.current = null;

      if (isReady && !isRefreshing) {
        setIsRefreshing(true);
        // Show feedback animation briefly before actual reload.
        window.setTimeout(() => {
          window.location.reload();
        }, 420);
        return;
      }

      setPullDistance(0);
      setIsReady(false);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isReady, isRefreshing]);

  const visible = pullDistance > 0 || isRefreshing;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-60 flex justify-center"
      aria-hidden
      style={{
        transform: `translateY(${isRefreshing ? 18 : Math.min(pullDistance - 44, 24)}px)`,
        opacity: visible ? 1 : 0,
        transition: visible ? "none" : "opacity 120ms ease, transform 120ms ease",
      }}
    >
      <div className="rounded-full border border-gray-300 bg-background/95 px-3 py-1 text-xs font-bold text-gray-700 shadow-xs backdrop-blur-sm flex items-center gap-2">
        {isRefreshing && (
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
        )}
        {isRefreshing ? "再読み込み中..." : isReady ? "離して再読み込み" : "下に引っ張って更新"}
      </div>
    </div>
  );
}
