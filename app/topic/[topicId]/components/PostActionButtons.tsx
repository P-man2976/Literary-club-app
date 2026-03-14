"use client";

import { HandDrawnHeartIcon } from "@/app/components/HandDrawnIcons";
import { ParticipantAvatars } from "./ParticipantAvatars";

interface Participant {
  key: string;
  name: string;
  icon: string | null;
}

interface PostActionButtonsProps {
  likes: number | undefined;
  isLiked: boolean;
  participants: Participant[];
  isAuthor: boolean;
  onLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
}

export function PostActionButtons({
  likes,
  isLiked,
  participants,
  isAuthor,
  onLike,
  onEdit,
  onDelete,
  deleteDisabled = false,
  deleteDisabledReason,
}: PostActionButtonsProps) {
  return (
    <div className="flex gap-3 mb-4">
      <button
        onClick={onLike}
        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition border-3 shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover ${
          isLiked
            ? "bg-pink-400 text-white border-white"
            : "bg-gray-200 text-black border-black"
        } flex items-center gap-2`}
      >
        <HandDrawnHeartIcon size={13} filled={isLiked} /> {likes || 0}
      </button>
      <ParticipantAvatars participants={participants} />
      {isAuthor && (
        <>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs bg-cyan-400 text-black rounded-lg font-black uppercase border-3 border-black shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover transition-all"
          >
            編集
          </button>
          <button
            onClick={onDelete}
            disabled={deleteDisabled}
            className={`px-3 py-1.5 text-xs rounded-lg font-black uppercase border-3 shadow-street-hard transition-all ${
              deleteDisabled
                ? "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-50"
                : "bg-red-400 text-white border-white hover:translate-y-[-2px] hover:shadow-street-hard-hover"
            }`}
            title={deleteDisabledReason || "削除"}
          >
            削除
          </button>
        </>
      )}
    </div>
  );
}
