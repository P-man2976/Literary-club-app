"use client";

import type { Post } from "@/app/types/post";
import { UserIcon } from "./UserIcon";
import { VerticalTextDisplay } from "./VerticalTextDisplay";
import { PostActionButtons } from "./PostActionButtons";
import { CommentSection } from "./CommentSection";
import { CommentInput } from "./CommentInput";
import { EditPostForm } from "./EditPostForm";

interface Participant {
  key: string;
  name: string;
  icon: string | null;
}

interface ReplyCardProps {
  reply: Post;
  appTheme: "street" | "chrome" | "library";
  cardClassName: string;
  // Edit state
  isEditing: boolean;
  onEditSave: (postId: string, title: string, body: string) => void;
  onEditCancel: () => void;
  onEditStart: (postId: string) => void;
  // User display
  iconCacheBust: number;
  getDisplayIcon: (email: string | null | undefined) => string | null | undefined;
  getDisplayName: (email: string | null | undefined, fallback: string) => string;
  // Like
  isLiked: boolean;
  likeParticipants: Participant[];
  onLike: () => void;
  // Author
  isAuthor: boolean;
  onDelete: () => void;
  // Comment state
  sessionEmail: string | null | undefined;
  onCommentEditSave: (commentId: string, text: string) => void;
  onCommentDelete: (commentId: string) => void;
  // Comment input
  onCommentSubmit: (postId: string, text: string) => void;
}

export function ReplyCard({
  reply,
  cardClassName,
  appTheme,
  isEditing,
  onEditSave,
  onEditCancel,
  onEditStart,
  iconCacheBust,
  getDisplayIcon,
  getDisplayName,
  isLiked,
  likeParticipants,
  onLike,
  isAuthor,
  onDelete,
  sessionEmail,
  onCommentEditSave,
  onCommentDelete,
  onCommentSubmit,
}: ReplyCardProps) {
  return (
    <div className={cardClassName}>
      {/* 編集フォーム */}
      {isEditing ? (
        <EditPostForm
          postId={reply.id}
          initialTitle={reply.title}
          initialBody={reply.body}
          theme={appTheme}
          onSave={onEditSave}
          onCancel={onEditCancel}
        />
      ) : (
        <>
          {/* 投稿本体 */}
          <div className="mb-4">
            <h4 className="text-xl font-black uppercase tracking-wide text-black chrome:text-green-300 mb-3">
              {reply.title}
            </h4>
            <VerticalTextDisplay
              body={reply.body}
              className="mb-4 overflow-x-auto border-3 border-black chrome:border-green-700 rounded-xl p-4 bg-cyan-50 chrome:bg-gray-950 relative group"
              textClassName="text-black chrome:text-green-200 whitespace-pre-wrap font-semibold"
              hintClassName="hidden group-hover:flex absolute top-2 left-2 bg-cyan-600 chrome:bg-green-600 text-white chrome:text-black text-xs px-3 py-2 rounded-lg font-black uppercase pointer-events-none z-10 border-2 border-black chrome:border-green-500"
            />
            <div className="flex items-center justify-between text-sm font-bold mb-4">
              <span className="flex items-center gap-2">
                <UserIcon
                  src={getDisplayIcon(reply.authorEmail)}
                  alt="投稿者アイコン"
                  size="sm"
                  cacheBust={iconCacheBust}
                />
                <span className="uppercase font-black text-black chrome:text-green-300">
                  {getDisplayName(reply.authorEmail, reply.author)}
                </span>
              </span>
              <span className="text-xs">
                {new Date(reply.createdAt).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <PostActionButtons
              likes={reply.likes}
              isLiked={isLiked}
              participants={likeParticipants}
              isAuthor={isAuthor}
              onLike={onLike}
              onEdit={() => onEditStart(reply.id)}
              onDelete={onDelete}
            />
          </div>
        </>
      )}

      {/* コメント一覧 */}
      <CommentSection
        comments={reply.comments ?? []}
        appTheme={appTheme}
        sessionEmail={sessionEmail}
        iconCacheBust={iconCacheBust}
        getDisplayIcon={getDisplayIcon}
        getDisplayName={getDisplayName}
        onEditSave={onCommentEditSave}
        onDelete={onCommentDelete}
      />

      {/* コメント入力フォーム */}
      <CommentInput
        theme={appTheme}
        onSubmit={(text) => onCommentSubmit(reply.id, text)}
      />
    </div>
  );
}
