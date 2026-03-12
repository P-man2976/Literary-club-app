import { useCallback } from "react";
import useSWRMutation from "swr/mutation";
import type { KeyedMutator } from "swr";

// --- fetcher 関数 ---

async function postFetcher(url: string, { arg }: { arg: Record<string, unknown> }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "リクエストに失敗しました");
  }
  return res.json();
}

async function patchFetcher(url: string, { arg }: { arg: Record<string, unknown> }) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "更新に失敗しました" }));
    throw new Error(data.error || "更新に失敗しました");
  }
  return res.json();
}

async function deleteFetcher(url: string, { arg }: { arg: Record<string, unknown> }) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "削除に失敗しました" }));
    throw new Error(data.error || "削除に失敗しました");
  }
  return res.json();
}

async function putFetcher(url: string, { arg }: { arg: Record<string, unknown> }) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "編集に失敗しました" }));
    throw new Error(data.error || "編集に失敗しました");
  }
  return res.json();
}

async function deletePostFetcher(url: string, { arg }: { arg: { postId: string } }) {
  const res = await fetch(`${url}?postId=${encodeURIComponent(arg.postId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("削除に失敗しました");
  }
  return res.json();
}

async function likeFetcher(
  url: string,
  { arg }: { arg: { postId: string; userId: string; method: "POST" | "DELETE" } }
) {
  const res = await fetch(url, {
    method: arg.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId: arg.postId, userId: arg.userId }),
  });
  if (!res.ok) {
    throw new Error("いいね操作に失敗しました");
  }
  return res.json();
}

// --- フック ---

type UseTopicMutationsParams = {
  topicId: string;
  session: { user?: { name?: string | null; email?: string | null } } | null;
  penName: string;
  mutateAll: () => void;
  mutateLikes: KeyedMutator<unknown>;
  likesData: unknown;
  router: { push: (url: string) => void };
  getAnonymousUserId: () => string;
};

export function useTopicMutations({
  topicId,
  session,
  penName,
  mutateAll,
  mutateLikes,
  likesData,
  router,
  getAnonymousUserId,
}: UseTopicMutationsParams) {
  // --- 返信投稿 ---
  const { trigger: triggerCreateReply, isMutating: isCreatingReply } =
    useSWRMutation("/api/posts", postFetcher);

  // --- 投稿編集 ---
  const { trigger: triggerEditPost } = useSWRMutation("/api/posts", patchFetcher);

  // --- 投稿削除 ---
  const { trigger: triggerDeletePost } = useSWRMutation("/api/posts", deletePostFetcher);

  // --- コメント投稿 ---
  const { trigger: triggerCreateComment } = useSWRMutation("/api/comments", postFetcher);

  // --- コメント編集 ---
  const { trigger: triggerEditComment } = useSWRMutation("/api/comments", putFetcher);

  // --- コメント削除 ---
  const { trigger: triggerDeleteComment } = useSWRMutation("/api/comments", deleteFetcher);

  // --- いいね ---
  const { trigger: triggerLike } = useSWRMutation("/api/likes", likeFetcher);

  const saveReply = useCallback(
    (newPost: { title?: string; body?: string; tag?: string }, onSuccess?: () => void) => {
      if (!newPost.title || !newPost.body) {
        alert("タイトルと本文を入力してください");
        return;
      }

      triggerCreateReply(
        {
          title: newPost.title,
          body: newPost.body,
          author: penName || session?.user?.name || "匿名部員",
          authorEmail: session?.user?.email || null,
          tag: newPost.tag || "創作",
          parentPostId: topicId,
          isTopicPost: 0,
        },
        {
          onSuccess: () => {
            alert("投稿しました！");
            mutateAll();
            onSuccess?.();
          },
          onError: (error) => {
            console.error("投稿エラー:", error);
            alert("投稿に失敗しました");
          },
        }
      );
    },
    [triggerCreateReply, penName, session, topicId, mutateAll]
  );

  const handleLike = useCallback(
    (postId: string) => {
      const userId = session?.user?.email || getAnonymousUserId();
      const currentUserIds = getLikeUserIds(likesData, postId, topicId);
      const isLiked = currentUserIds.includes(userId);
      const method = isLiked ? "DELETE" : "POST";

      const optimisticLikesData = buildOptimisticLikesData(
        likesData,
        postId,
        userId,
        isLiked,
        topicId
      );

      mutateLikes(
        triggerLike({ postId, userId, method }).then(() => undefined),
        {
          optimisticData: optimisticLikesData,
          revalidate: true,
          rollbackOnError: true,
        }
      );
    },
    [session, getAnonymousUserId, likesData, topicId, mutateLikes, triggerLike]
  );

  const isPostLiked = useCallback(
    (postId: string) => {
      const userId = session?.user?.email || getAnonymousUserId();
      const userIds = getLikeUserIds(likesData, postId, topicId);
      return userIds.includes(userId);
    },
    [session, getAnonymousUserId, likesData, topicId]
  );

  const deletePost = useCallback(
    (postId: string) => {
      if (!confirm("本当に削除しますか？")) return;

      triggerDeletePost(
        { postId },
        {
          onSuccess: () => {
            if (postId === topicId) {
              setTimeout(() => router.push("/"), 300);
            } else {
              alert("削除しました！");
              mutateAll();
            }
          },
          onError: (error) => {
            console.error("削除エラー:", error);
          },
        }
      );
    },
    [triggerDeletePost, topicId, mutateAll, router]
  );

  const saveEditedPost = useCallback(
    (postId: string, title: string, body: string, onSuccess?: () => void) => {
      if (!title.trim() || !body.trim()) {
        alert("タイトルと内容は必須です");
        return;
      }

      triggerEditPost(
        {
          postId,
          title,
          body,
          authorEmail: session?.user?.email,
        },
        {
          onSuccess: () => {
            alert("更新しました！");
            mutateAll();
            onSuccess?.();
          },
          onError: (error) => {
            console.error("編集エラー:", error);
            alert(
              error instanceof Error
                ? `更新に失敗しました: ${error.message}`
                : "編集に失敗しました"
            );
          },
        }
      );
    },
    [triggerEditPost, session, mutateAll]
  );

  const saveComment = useCallback(
    (postId: string, text: string, onSuccess?: () => void) => {
      if (!text) return;

      triggerCreateComment(
        {
          postId,
          text,
          author: penName || session?.user?.name || "匿名部員",
          authorEmail: session?.user?.email || null,
        },
        {
          onSuccess: () => {
            alert("コメントを送信しました！");
            mutateAll();
            onSuccess?.();
          },
          onError: (error) => {
            console.error("コメント送信エラー:", error);
          },
        }
      );
    },
    [triggerCreateComment, penName, session, mutateAll]
  );

  const editComment = useCallback(
    (commentId: string, text: string, onSuccess?: () => void) => {
      if (!text.trim()) {
        alert("コメントを入力してください");
        return;
      }

      triggerEditComment(
        {
          commentId,
          text,
          authorEmail: session?.user?.email || null,
        },
        {
          onSuccess: () => {
            alert("コメントを編集しました！");
            mutateAll();
            onSuccess?.();
          },
          onError: (error) => {
            console.error("コメント編集エラー:", error);
            alert(
              error instanceof Error ? error.message : "編集に失敗しました"
            );
          },
        }
      );
    },
    [triggerEditComment, session, mutateAll]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      if (!confirm("このコメントを削除しますか？")) return;

      triggerDeleteComment(
        {
          commentId,
          authorEmail: session?.user?.email || null,
        },
        {
          onSuccess: () => {
            alert("コメントを削除しました");
            mutateAll();
          },
          onError: (error) => {
            console.error("コメント削除エラー:", error);
            alert(
              error instanceof Error ? error.message : "削除に失敗しました"
            );
          },
        }
      );
    },
    [triggerDeleteComment, session, mutateAll]
  );

  return {
    saveReply,
    isCreatingReply,
    handleLike,
    isPostLiked,
    deletePost,
    saveEditedPost,
    saveComment,
    editComment,
    deleteComment,
  };
}

// --- ヘルパー関数 ---

/** likesData (SWR raw) から特定 postId の userIds を取得 */
function getLikeUserIds(
  likesData: unknown,
  postId: string,
  topicId: string
): string[] {
  if (!likesData) return [];
  const data = likesData as Record<string, unknown>;

  // 単一 postId の場合: { count, userIds }
  if (data.userIds) {
    return Array.isArray(data.userIds) ? (data.userIds as string[]) : [];
  }

  // 複数 postIds の場合: { [postId]: string[] }
  const entry = data[postId];
  if (Array.isArray(entry)) return entry as string[];

  return [];
}

/** 楽観的更新用の likesData を構築 */
function buildOptimisticLikesData(
  likesData: unknown,
  postId: string,
  userId: string,
  isLiked: boolean,
  topicId: string
): unknown {
  if (!likesData) return likesData;
  const data = likesData as Record<string, unknown>;

  // 単一 postId の場合: { count, userIds }
  if (data.userIds) {
    const currentUserIds = Array.isArray(data.userIds)
      ? (data.userIds as string[])
      : [];
    const newUserIds = isLiked
      ? currentUserIds.filter((id) => id !== userId)
      : [...currentUserIds, userId];
    return { count: newUserIds.length, userIds: newUserIds };
  }

  // 複数 postIds の場合: { [postId]: string[] }
  const currentUserIds = Array.isArray(data[postId])
    ? (data[postId] as string[])
    : [];
  const newUserIds = isLiked
    ? currentUserIds.filter((id) => id !== userId)
    : [...currentUserIds, userId];
  return { ...data, [postId]: newUserIds };
}
