import { useCallback } from "react";
import useSWRMutation from "swr/mutation";

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
  router: { push: (url: string) => void };
  getAnonymousUserId: () => string;
};

export function useTopicMutations({
  topicId,
  session,
  penName,
  mutateAll,
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
    (postId: string, isLiked: boolean) => {
      const userId = session?.user?.email || getAnonymousUserId();
      const method = isLiked ? "DELETE" : "POST";

      triggerLike(
        { postId, userId, method },
        {
          onSuccess: () => {
            mutateAll();
          },
          onError: (error) => {
            console.error("いいね操作エラー:", error);
          },
        }
      );
    },
    [session, getAnonymousUserId, triggerLike, mutateAll]
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
    deletePost,
    saveEditedPost,
    saveComment,
    editComment,
    deleteComment,
  };
}
