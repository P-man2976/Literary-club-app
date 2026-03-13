"use client";

import { Avatar } from "@/app/components/ui/Avatar";

interface Participant {
  key: string;
  name: string;
  icon: string | null;
}

interface ParticipantAvatarsProps {
  participants: Participant[];
  maxDisplay?: number;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
};

const borderClasses = {
  sm: "border-2",
  md: "border-3",
};

export function ParticipantAvatars({
  participants,
  maxDisplay = 6,
  size = "sm",
  className = "",
}: ParticipantAvatarsProps) {
  if (participants.length === 0) return null;

  const displayed = participants.slice(0, maxDisplay);
  const overflow = participants.length - maxDisplay;

  return (
    <div className={`flex items-center -space-x-2 ${className}`} title="いいねしたユーザー">
      {displayed.map((participant) => (
        <Avatar
          key={participant.key}
          src={participant.icon ?? undefined}
          alt={participant.name}
          fallback={participant.name.slice(0, 1) || "G"}
          className={`${sizeClasses[size]} ${borderClasses[size]} border-white shadow-street-hard-active`}
        />
      ))}
      {overflow > 0 && (
        <div className={`${sizeClasses[size]} rounded-full bg-black/70 text-[10px] font-black text-white ${borderClasses[size]} border-white flex items-center justify-center`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
