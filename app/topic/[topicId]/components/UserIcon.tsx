"use client";

import { Avatar } from "@/app/components/ui/Avatar";

interface UserIconProps {
  src: string | null | undefined;
  alt?: string;
  size?: "sm" | "comment";
  cacheBust?: number;
  className?: string;
  fallback?: React.ReactNode;
}

const sizeClasses = {
  sm: "h-8 w-8 min-w-8 min-h-8",
  comment: "h-6 w-6",
};

export function UserIcon({
  src,
  alt = "ユーザーアイコン",
  size = "sm",
  cacheBust,
  className = "",
  fallback,
}: UserIconProps) {
  const imgSrc = src && cacheBust ? `${src}?_=${cacheBust}` : src ?? undefined;

  return (
    <Avatar
      src={imgSrc}
      alt={alt}
      fallback={fallback}
      className={`${sizeClasses[size]} shrink-0 border-2 border-black chrome:border-green-400 ${className}`}
    />
  );
}
