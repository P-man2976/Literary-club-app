import { useCallback } from "react";
import useSWRMutation from "swr/mutation";

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

type UseCommentMutationsParams = {
  session: { user?: { name?: string | null; email?: string | null } } | null;
  penName: string;
  mutateComments: () => void;
};

export function useCommentMutations({
  session,
  penName,
  mutateComments,
}: UseCommentMutationsParams) {
  const { trigger: triggerCreateComment } = useSWRMutation("/api/comments", postFetcher);
  const { trigger: triggerEditComment } = useSWRMutation("/api/comments", putFetcher);
  const { trigger: triggerDeleteComment } = useSWRMutation("/api/comments", deleteFetcher);

  const saveComment = useCallback(
    (postId: string, text: string) => {
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
            mutateComments();
          },
          onError: (error) => {
            console.error("コメント送信エラー:", error);
          },
        }
      );
    },
    [triggerCreateComment, penName, session, mutateComments]
  );

  const editComment = useCallback(
    (commentId: string, text: string) => {
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
            mutateComments();
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
    [triggerEditComment, session, mutateComments]
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
            mutateComments();
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
    [triggerDeleteComment, session, mutateComments]
  );

  return {
    saveComment,
    editComment,
    deleteComment,
  };
}
