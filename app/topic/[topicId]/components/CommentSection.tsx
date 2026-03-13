"use client";

import { HandDrawnCommentIcon, HandDrawnHeartIcon } from "@/app/components/HandDrawnIcons";
import { UserIcon } from "./UserIcon";
import type { Comment } from "@/app/types/post";
import { tv } from "tailwind-variants";

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
  editingCommentId: string | null;
  editingCommentText: string;
  commentLikes: { [key: string]: boolean };
  sessionEmail: string | null | undefined;
  iconCacheBust: number;
  getDisplayIcon: (email: string | null | undefined) => string | null | undefined;
  getDisplayName: (email: string | null | undefined, fallback: string) => string;
  onEditTextChange: (text: string) => void;
  onEditSave: (commentId: string) => void;
  onEditCancel: () => void;
  onEditStart: (commentId: string, currentText: string) => void;
  onToggleLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

export function CommentSection({
  comments,
  appTheme,
  editingCommentId,
  editingCommentText,
  commentLikes,
  sessionEmail,
  iconCacheBust,
  getDisplayIcon,
  getDisplayName,
  onEditTextChange,
  onEditSave,
  onEditCancel,
  onEditStart,
  onToggleLike,
  onDelete,
}: CommentSectionProps) {
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
              <span className="text-xs font-bold">{new Date(comment.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {editingCommentId === comment.commentId ? (
              <div className="space-y-2">
                <textarea
                  value={editingCommentText}
                  onChange={(e) => onEditTextChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 chrome:border-slate-700 bg-slate-50 chrome:bg-slate-800 text-gray-900 chrome:text-slate-100 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditSave(comment.commentId)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-sm text-xs hover:bg-blue-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={onEditCancel}
                    className="px-3 py-1 bg-default-300 chrome:bg-default-700 text-default-700 chrome:text-slate-200 rounded-sm text-xs hover:bg-default-400 chrome:hover:bg-default-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-black chrome:text-green-100 mb-2 whitespace-pre-wrap font-semibold">{comment.text}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleLike(comment.commentId)}
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
                        onClick={() => onEditStart(comment.commentId, comment.text)}
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
