"use client";

import { useState, useRef, useEffect } from "react";

interface VerticalTextDisplayProps {
  body: string;
  className?: string;
  textClassName?: string;
  hintClassName?: string;
}

const HINT_DISMISSED_KEY = "lit-club-horizontal-hint-dismissed";

function getInitialShowHint(): boolean {
  if (typeof window === "undefined") return false;
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) return false;
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) !== "1";
  } catch {
    return true;
  }
}

export function VerticalTextDisplay({
  body,
  className = "mb-4 overflow-x-auto border border-gray-200 chrome:border-green-700 rounded-lg p-4 bg-slate-50 chrome:bg-gray-950 relative group",
  textClassName = "text-default-900 chrome:text-green-200 whitespace-pre-wrap font-semibold",
  hintClassName = "hidden group-hover:flex absolute top-2 left-2 bg-blue-600 chrome:bg-green-600 text-white chrome:text-black text-xs px-3 py-1 rounded-md pointer-events-none z-10 font-black uppercase",
}: VerticalTextDisplayProps) {
  const [showHint, setShowHint] = useState(getInitialShowHint);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => setIsScrolling(false), 200);
  };

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, "1");
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div
      className={className}
      onScroll={handleScroll}
      onWheel={(event) => {
        if (event.shiftKey && showHint) dismissHint();
      }}
      style={{ direction: "rtl" }}
    >
      {showHint && !isScrolling && (
        <div className={hintClassName}>
          Shift + スクロールで横スクロールできます
        </div>
      )}
      <p
        className={textClassName}
        style={{
          writingMode: "vertical-rl",
          height: "400px",
          minWidth: "fit-content",
          direction: "ltr",
        }}
      >
        {body}
      </p>
    </div>
  );
}
