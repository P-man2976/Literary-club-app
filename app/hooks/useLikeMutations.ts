import { useCallback } from "react";
import useSWRMutation from "swr/mutation";

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

type UseLikeMutationsParams = {
  session: { user?: { name?: string | null; email?: string | null } } | null;
  getAnonymousUserId: () => string;
  mutateLikes: () => void;
};

export function useLikeMutations({
  session,
  getAnonymousUserId,
  mutateLikes,
}: UseLikeMutationsParams) {
  const { trigger: triggerLike } = useSWRMutation("/api/likes", likeFetcher);

  const handleLike = useCallback(
    (postId: string, isLiked: boolean) => {
      const userId = session?.user?.email || getAnonymousUserId();
      const method = isLiked ? "DELETE" : "POST";

      triggerLike(
        { postId, userId, method },
        {
          onSuccess: () => {
            mutateLikes();
          },
          onError: (error) => {
            console.error("いいね操作エラー:", error);
          },
        }
      );
    },
    [session, getAnonymousUserId, triggerLike, mutateLikes]
  );

  return { handleLike };
}
