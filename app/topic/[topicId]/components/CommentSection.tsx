"use client";

import { useState } from "react";
import { HandDrawnCommentIcon, HandDrawnHeartIcon } from "@/app/components/HandDrawnIcons";
import { UserIcon } from "./UserIcon";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Input";
import type { Comment } from "@/app/types/post";
import { tv } from "tailwind-variants";
import { formatDateTime } from "@/app/lib/formatUtils";

const commentBubble = tv({
  base: "p-4 rounded-xl",
  variants: {
    theme: {
      street: "bg-gradient-to-r from-green-100 to-cyan-100 border-3 border-black shadow-street-hard-sm",
      chrome: "bg-slate-800/80 border border-green-700/50 backdrop-blur-sm",
      library: "bg-library-surface shadow-library-neu-sm",
    },
  },
});

interface CommentSectionProps {
  comments: Comment[];
  appTheme: "street" | "chrome" | "library";
  sessionEmail: string | null | undefined;
  iconCacheBust: number;
  getDisplayIcon: (email: string | null | undefined) => string | null | undefined;
  getDisplayName: (email: string | null | undefined, fallback: string) => string;
  onEditSave: (commentId: string, text: string) => void;
  onDelete: (commentId: string) => void;
}

export function CommentSection({
  comments,
  appTheme,
  sessionEmail,
  iconCacheBust,
  getDisplayIcon,
  getDisplayName,
  onEditSave,
  onDelete,
}: CommentSectionProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({});

  const startEditing = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditing = (commentId: string) => {
    onEditSave(commentId, editingCommentText);
    cancelEditing();
  };

  const toggleLike = (commentId: string) => {
    setCommentLikes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  if (!comments || comments.length === 0) return null;

  return (
    <div className="mb-4 pt-4 border-t-4 border-black">
      <p className="text-sm font-black uppercase mb-3 flex items-center gap-2 tracking-wide">
        <HandDrawnCommentIcon size={18} /> コメント ({comments.length})
      </p>
      <div className="space-y-3">
        {comments.sort((a, b) => a.createdAt - b.createdAt).map((comment) => (
          <div key={comment.commentId} className={commentBubble({ theme: appTheme })}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-black flex items-center gap-2 uppercase text-xs text-black chrome:text-green-300">
                <UserIcon
                  src={getDisplayIcon(comment.authorEmail)}
                  alt="コメント投稿者アイコン"
                  size="comment"
                  cacheBust={iconCacheBust}
                />
                {getDisplayName(comment.authorEmail, comment.author)}
                {comment.editedAt && (
                  <span className="text-xs">(編集済み)</span>
                )}
              </span>
              <span className="text-xs font-bold">{formatDateTime(comment.createdAt)}</span>
            </div>

            {editingCommentId === comment.commentId ? (
              <div className="space-y-2">
                <Textarea
                  value={editingCommentText}
                  onValueChange={setEditingCommentText}
                  theme={appTheme}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    theme={appTheme}
                    onClick={() => saveEditing(comment.commentId)}
                  >
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    theme={appTheme}
                    onClick={cancelEditing}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-black chrome:text-green-100 mb-2 whitespace-pre-wrap font-semibold">{comment.text}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleLike(comment.commentId)}
                    className={`text-xs px-3 py-1 rounded-lg font-black uppercase transition border-2 shadow-street-hard-sm hover:-translate-y-px hover:shadow-street-hard-sm-hover ${
                      commentLikes[comment.commentId]
                        ? "bg-pink-400 text-white border-white"
                        : "bg-white text-black border-black"
                    } flex items-center gap-1`}
                  >
                    <HandDrawnHeartIcon size={12} filled={commentLikes[comment.commentId]} /> {commentLikes[comment.commentId] ? 1 : 0}
                  </button>
                  {sessionEmail === comment.authorEmail && (
                    <>
                      <button
                        onClick={() => startEditing(comment.commentId, comment.text)}
                        className="text-xs px-3 py-1 bg-cyan-400 text-black rounded-lg font-black uppercase border-2 border-black hover:-translate-y-px transition-all shadow-street-hard-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onDelete(comment.commentId)}
                        className="text-xs px-3 py-1 bg-red-400 text-white rounded-lg font-black uppercase border-2 border-white hover:-translate-y-px transition-all shadow-street-hard-sm"
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
