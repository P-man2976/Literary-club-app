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
};

export function useTopicMutations({
  topicId,
  session,
  penName,
  mutateAll,
  mutateLikes,
  likesData,
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
    async (newPost: { title?: string; body?: string; tag?: string }) => {
      if (!newPost.title || !newPost.body) {
        alert("タイトルと本文を入力してください");
        return false;
      }

      try {
        await triggerCreateReply({
          title: newPost.title,
          body: newPost.body,
          author: penName || session?.user?.name || "匿名部員",
          authorEmail: session?.user?.email || null,
          tag: newPost.tag || "創作",
          parentPostId: topicId,
          isTopicPost: 0,
        });
        alert("投稿しました！");
        mutateAll();
        return true;
      } catch (error) {
        console.error("投稿エラー:", error);
        alert("投稿に失敗しました");
        return false;
      }
    },
    [triggerCreateReply, penName, session, topicId, mutateAll]
  );

  const handleLike = useCallback(
    async (postId: string, getAnonymousUserId: () => string) => {
      const userId = session?.user?.email || getAnonymousUserId();

      // likesDataから現在のいいね状態を判定
      const currentUserIds = getLikeUserIds(likesData, postId, topicId);
      const isLiked = currentUserIds.includes(userId);
      const method = isLiked ? "DELETE" : "POST";

      // SWR 楽観的更新: likesData を即座に更新
      const optimisticLikesData = buildOptimisticLikesData(
        likesData,
        postId,
        userId,
        isLiked,
        topicId
      );

      try {
        await mutateLikes(
          async () => {
            await triggerLike({ postId, userId, method });
            // 実際のデータで再検証するため undefined を返す
            return undefined;
          },
          {
            optimisticData: optimisticLikesData,
            revalidate: true,
            rollbackOnError: true,
          }
        );
      } catch (error) {
        console.error("いいね操作エラー:", error);
      }
    },
    [session, likesData, topicId, mutateLikes, triggerLike]
  );

  const isPostLiked = useCallback(
    (postId: string, getAnonymousUserId: () => string) => {
      const userId = session?.user?.email || getAnonymousUserId();
      const userIds = getLikeUserIds(likesData, postId, topicId);
      return userIds.includes(userId);
    },
    [session, likesData, topicId]
  );

  const deletePost = useCallback(
    async (postId: string, router: { push: (url: string) => void }) => {
      if (!confirm("本当に削除しますか？")) return;

      try {
        await triggerDeletePost({ postId });

        if (postId === topicId) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          router.push("/");
        } else {
          alert("削除しました！");
          mutateAll();
        }
      } catch (error) {
        console.error("削除エラー:", error);
      }
    },
    [triggerDeletePost, topicId, mutateAll]
  );

  const saveEditedPost = useCallback(
    async (postId: string, title: string, body: string) => {
      if (!title.trim() || !body.trim()) {
        alert("タイトルと内容は必須です");
        return false;
      }

      try {
        await triggerEditPost({
          postId,
          title,
          body,
          authorEmail: session?.user?.email,
        });
        alert("更新しました！");
        mutateAll();
        return true;
      } catch (error) {
        console.error("編集エラー:", error);
        alert(
          error instanceof Error ? `更新に失敗しました: ${error.message}` : "編集に失敗しました"
        );
        return false;
      }
    },
    [triggerEditPost, session, mutateAll]
  );

  const saveComment = useCallback(
    async (postId: string, text: string) => {
      if (!text) return false;

      try {
        await triggerCreateComment({
          postId,
          text,
          author: penName || session?.user?.name || "匿名部員",
          authorEmail: session?.user?.email || null,
        });
        alert("コメントを送信しました！");
        mutateAll();
        return true;
      } catch (error) {
        console.error("コメント送信エラー:", error);
        return false;
      }
    },
    [triggerCreateComment, penName, session, mutateAll]
  );

  const editComment = useCallback(
    async (commentId: string, text: string) => {
      if (!text.trim()) {
        alert("コメントを入力してください");
        return false;
      }

      try {
        await triggerEditComment({
          commentId,
          text,
          authorEmail: session?.user?.email || null,
        });
        alert("コメントを編集しました！");
        mutateAll();
        return true;
      } catch (error) {
        console.error("コメント編集エラー:", error);
        alert(
          error instanceof Error ? error.message : "編集に失敗しました"
        );
        return false;
      }
    },
    [triggerEditComment, session, mutateAll]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!confirm("このコメントを削除しますか？")) return;

      try {
        await triggerDeleteComment({
          commentId,
          authorEmail: session?.user?.email || null,
        });
        alert("コメントを削除しました");
        mutateAll();
      } catch (error) {
        console.error("コメント削除エラー:", error);
        alert(
          error instanceof Error ? error.message : "削除に失敗しました"
        );
      }
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
