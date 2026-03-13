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
  editingTitle: string;
  editingBody: string;
  onEditTitleChange: (title: string) => void;
  onEditBodyChange: (body: string) => void;
  onEditSave: (postId: string) => void;
  onEditCancel: () => void;
  onEditStart: (postId: string, title: string, body: string) => void;
  // Vertical text
  scrollingPostId: string | null;
  showHorizontalHint: boolean;
  onBodyScroll: (postId: string) => void;
  onDismissHint: () => void;
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
  editingCommentId: string | null;
  editingCommentText: string;
  commentLikes: { [key: string]: boolean };
  sessionEmail: string | null | undefined;
  onCommentEditTextChange: (text: string) => void;
  onCommentEditSave: (commentId: string) => void;
  onCommentEditCancel: () => void;
  onCommentEditStart: (commentId: string, currentText: string) => void;
  onCommentToggleLike: (commentId: string) => void;
  onCommentDelete: (commentId: string) => void;
  // Comment input
  commentText: string;
  onCommentTextChange: (postId: string, value: string) => void;
  onCommentSubmit: (postId: string) => void;
}

export function ReplyCard({
  reply,
  cardClassName,
  appTheme,
  isEditing,
  editingTitle,
  editingBody,
  onEditTitleChange,
  onEditBodyChange,
  onEditSave,
  onEditCancel,
  onEditStart,
  scrollingPostId,
  showHorizontalHint,
  onBodyScroll,
  onDismissHint,
  iconCacheBust,
  getDisplayIcon,
  getDisplayName,
  isLiked,
  likeParticipants,
  onLike,
  isAuthor,
  onDelete,
  editingCommentId,
  editingCommentText,
  commentLikes,
  sessionEmail,
  onCommentEditTextChange,
  onCommentEditSave,
  onCommentEditCancel,
  onCommentEditStart,
  onCommentToggleLike,
  onCommentDelete,
  commentText,
  onCommentTextChange,
  onCommentSubmit,
}: ReplyCardProps) {
  return (
    <div className={cardClassName}>
      {/* 編集フォーム */}
      {isEditing ? (
        <EditPostForm
          postId={reply.id}
          title={editingTitle}
          body={editingBody}
          onTitleChange={onEditTitleChange}
          onBodyChange={onEditBodyChange}
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
              postId={reply.id}
              body={reply.body}
              scrollingPostId={scrollingPostId}
              showHorizontalHint={showHorizontalHint}
              onScroll={onBodyScroll}
              onDismissHint={onDismissHint}
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
              postId={reply.id}
              likes={reply.likes}
              isLiked={isLiked}
              participants={likeParticipants}
              isAuthor={isAuthor}
              onLike={onLike}
              onEdit={() => onEditStart(reply.id, reply.title, reply.body)}
              onDelete={onDelete}
            />
          </div>
        </>
      )}

      {/* コメント一覧 */}
      <CommentSection
        comments={reply.comments ?? []}
        appTheme={appTheme}
        editingCommentId={editingCommentId}
        editingCommentText={editingCommentText}
        commentLikes={commentLikes}
        sessionEmail={sessionEmail}
        iconCacheBust={iconCacheBust}
        getDisplayIcon={getDisplayIcon}
        getDisplayName={getDisplayName}
        onEditTextChange={onCommentEditTextChange}
        onEditSave={onCommentEditSave}
        onEditCancel={onCommentEditCancel}
        onEditStart={onCommentEditStart}
        onToggleLike={onCommentToggleLike}
        onDelete={onCommentDelete}
      />

      {/* コメント入力フォーム */}
      <CommentInput
        postId={reply.id}
        value={commentText}
        onChange={onCommentTextChange}
        onSubmit={onCommentSubmit}
      />
    </div>
  );
}
