import type { Post } from "@/app/types/post";
import type { KeyedMutator } from "swr";

type PostActionsParams = {
  session: { user?: { name?: string | null; email?: string | null } } | null;
  penName: string;
  mutatePosts: KeyedMutator<Post[]>;
};

export function createPostActions({
  session,
  penName,
  mutatePosts,
}: PostActionsParams) {
  const saveEditedProposal = async (
    proposalId: string,
    editingProposalTitle: string,
    editingProposalBody: string
  ) => {
    if (!editingProposalTitle.trim() || !editingProposalBody.trim()) {
      alert("タイトルと内容は必須です");
      return false;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: proposalId,
          title: editingProposalTitle,
          body: editingProposalBody,
          authorEmail: session?.user?.email,
        }),
      });

      if (response.ok) {
        alert("更新しました！");
        mutatePosts();
        return true;
      } else {
        const error = await response.json();
        alert(`更新に失敗しました: ${error.error}`);
        return false;
      }
    } catch (error) {
      console.error("編集エラー:", error);
      alert("編集に失敗しました");
      return false;
    }
  };

  const saveComment = async (
    postId: string,
    text: string
  ) => {
    if (!text) return false;

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          text,
          author: penName || session?.user?.name || "匿名部員",
          authorEmail: session?.user?.email || null,
        }),
      });

      if (response.ok) {
        alert("感想を送信しました！");
        mutatePosts();
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const response = await fetch(`/api/posts?postId=${encodeURIComponent(postId)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("削除しました！");
        mutatePosts();
      }
    } catch (error) {
      console.error("削除に失敗しました", error);
    }
  };

  const convertProposalToTopic = async (
    proposal: Post | undefined,
    deadline: number
  ) => {
    if (!proposal) {
      alert("お題案が見つかりません");
      return false;
    }

    try {
      const topicData: Record<string, unknown> = {
        ...proposal,
        isTopicPost: 1,
        deadline,
        tag: "お題",
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicData),
      });

      if (response.ok) {
        alert("お題を追加しました！");
        await mutatePosts();
        return true;
      } else {
        const error = await response.text();
        alert("エラー: " + error);
        return false;
      }
    } catch (error) {
      console.error("お題への変換に失敗しました", error);
      alert("お題への変換に失敗しました");
      return false;
    }
  };

  const convertPoolTopicToTopic = async (
    poolTopic: Post | undefined,
    deadline: number
  ) => {
    if (!poolTopic) {
      alert("過去お題が見つかりません");
      return false;
    }

    try {
      const topicData: Record<string, unknown> = {
        title: poolTopic.title,
        body: poolTopic.body,
        tag: "お題",
        isTopicPost: 1,
        deadline,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicData),
      });

      if (response.ok) {
        alert("過去お題プールからお題を追加しました！");
        await mutatePosts();
        return true;
      } else {
        const error = await response.text();
        alert("エラー: " + error);
        return false;
      }
    } catch (error) {
      console.error("過去お題からのお題作成に失敗しました", error);
      alert("過去お題からのお題作成に失敗しました");
      return false;
    }
  };

  const saveReplyInTopic = async (
    topicId: string,
    reply: { title: string; body: string } | undefined
  ) => {
    if (!reply || !reply.title || !reply.body) {
      alert("タイトルと本文を入力してください");
      return false;
    }

    try {
      const postData = {
        title: reply.title,
        body: reply.body,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
        tag: "創作",
        parentPostId: topicId,
        isTopicPost: 0,
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        alert("投稿しました！");
        mutatePosts();
        return true;
      } else {
        const error = await response.json();
        console.error("投稿エラー:", error);
        alert("投稿に失敗しました: " + (error.error || "不明なエラー"));
        return false;
      }
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
      return false;
    }
  };

  const saveToAWS = async (
    newPost: Partial<Post>,
    postingMode: "regular" | "topic" | "reply",
    selectedTopicId: string | null,
    forceMode?: "regular" | "topic" | "reply"
  ) => {
    if (!newPost.title || !newPost.body) return false;
    try {
      const effectiveMode = forceMode || postingMode;
      const postData: Record<string, unknown> = {
        ...newPost,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
      };

      if (effectiveMode === "topic") {
        postData.isTopicPost = 1;
        postData.parentPostId = null;
      } else if (effectiveMode === "reply" && selectedTopicId) {
        postData.parentPostId = selectedTopicId;
        postData.isTopicPost = 0;
      } else {
        postData.parentPostId = null;
        postData.isTopicPost = 0;
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        const mode =
          effectiveMode === "topic"
            ? "お題を作成しました！"
            : effectiveMode === "reply"
              ? "投稿しました！"
              : "保存しました！";
        alert(mode);
        mutatePosts();
        return true;
      } else {
        const errorText = await response.text();
        console.error("投稿エラー:", response.status, errorText);
        try {
          const error = JSON.parse(errorText);
          alert("投稿に失敗しました: " + (error.error || errorText));
        } catch {
          alert("投稿に失敗しました: " + errorText);
        }
        return false;
      }
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
      return false;
    }
  };

  return {
    saveEditedProposal,
    saveComment,
    deletePost,
    convertProposalToTopic,
    convertPoolTopicToTopic,
    saveReplyInTopic,
    saveToAWS,
  };
}
