import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import type { Post, Comment } from "@/app/types/post";
import { fetcher, profilesFetcher } from "@/app/lib/fetchers";
import { useIconUrlMap } from "@/app/hooks/useIconUrl";

type TopicAnalysis = {
  overview: string;
  strengths: string[];
  suggestions: string[];
  authorFeedback: Array<{
    author: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
  postFeedback: Array<{
    postId: string;
    title: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
};

const commentsFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("コメント取得に失敗しました");
    return res.json();
  });

const likesFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("いいね取得に失敗しました");
    return res.json();
  });

export function useTopicDetail(topicId: string) {
  // --- データ取得 (SWR) ---
  const {
    data: allPosts,
    error: postsError,
    isLoading: postsLoading,
    mutate: mutatePosts,
  } = useSWR<Post[]>("/api/posts", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  // トピックと返信を allPosts から導出
  const topic = useMemo(
    () => allPosts?.find((p) => p.id === topicId) ?? null,
    [allPosts, topicId]
  );

  const parentTopic = useMemo(() => {
    if (!topic?.parentPostId || !allPosts) return null;
    return allPosts.find((p) => p.id === topic.parentPostId) ?? null;
  }, [allPosts, topic]);

  const rawReplies = useMemo(() => {
    if (!allPosts) return [];
    return allPosts
      .filter((p) => p.parentPostId === topicId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [allPosts, topicId]);

  // postIds 一覧 (topic + replies) — コメント・いいね一括取得用
  const allPostIds = useMemo(() => {
    const ids = rawReplies.map((r) => r.id);
    if (topicId) ids.unshift(topicId);
    return ids;
  }, [topicId, rawReplies]);

  // コメント一括取得
  const commentsKey = useMemo(() => {
    if (allPostIds.length === 0) return null;
    if (allPostIds.length === 1) return `/api/comments?postId=${allPostIds[0]}`;
    return `/api/comments?postIds=${allPostIds.join(",")}`;
  }, [allPostIds]);

  const { data: commentsData, mutate: mutateComments } = useSWR(
    commentsKey,
    commentsFetcher,
    { revalidateOnFocus: false }
  );

  // いいね一括取得
  const likesKey = useMemo(() => {
    if (allPostIds.length === 0) return null;
    if (allPostIds.length === 1) return `/api/likes?postId=${allPostIds[0]}`;
    return `/api/likes?postIds=${allPostIds.join(",")}`;
  }, [allPostIds]);

  const { data: likesData, mutate: mutateLikes } = useSWR(
    likesKey,
    likesFetcher,
    { revalidateOnFocus: false }
  );

  // コメントをpostIdでマッピング
  const commentsByPostId = useMemo(() => {
    if (!commentsData) return new Map<string, Comment[]>();
    // 単一postId の場合は配列が直接返る
    if (Array.isArray(commentsData)) {
      return new Map<string, Comment[]>([[topicId, commentsData]]);
    }
    // 複数postIds の場合は { postId: Comment[] } のオブジェクト
    return new Map<string, Comment[]>(Object.entries(commentsData));
  }, [commentsData, topicId]);

  // いいねをpostIdでマッピング
  const likesByPostId = useMemo(() => {
    if (!likesData) return new Map<string, string[]>();
    // 単一postId の場合は { count, userIds } が返る
    if (likesData.userIds) {
      return new Map<string, string[]>([
        [topicId, Array.isArray(likesData.userIds) ? likesData.userIds : []],
      ]);
    }
    // 複数postIds の場合は { postId: string[] }
    return new Map<string, string[]>(Object.entries(likesData));
  }, [likesData, topicId]);

  // topic + comments + likes をマージ
  const topicWithDetails = useMemo(() => {
    if (!topic) return null;
    return {
      ...topic,
      comments: commentsByPostId.get(topic.id) || [],
      likesUserIds: likesByPostId.get(topic.id) || [],
    };
  }, [topic, commentsByPostId, likesByPostId]);

  // replies + comments + likes をマージ
  const replies = useMemo(
    () =>
      rawReplies.map((reply) => ({
        ...reply,
        comments: commentsByPostId.get(reply.id) || [],
        likesUserIds: likesByPostId.get(reply.id) || [],
      })),
    [rawReplies, commentsByPostId, likesByPostId]
  );

  // --- ペンネーム・アイコン ---
  const emailsFromTopic = useMemo(() => {
    const emails = new Set<string>();
    if (topic?.authorEmail) emails.add(topic.authorEmail);
    rawReplies.forEach((reply) => {
      if (reply.authorEmail) emails.add(reply.authorEmail);
    });
    // コメントの著者
    commentsByPostId.forEach((comments) => {
      comments.forEach((c) => {
        if (c.authorEmail) emails.add(c.authorEmail);
      });
    });
    // いいねのユーザー
    likesByPostId.forEach((userIds) => {
      userIds.forEach((id) => {
        if (id.includes("@")) emails.add(id);
      });
    });
    return Array.from(emails).sort();
  }, [topic, rawReplies, commentsByPostId, likesByPostId]);

  const { data: penNameData } = useSWR(
    emailsFromTopic.length > 0 ? ["/api/profiles", emailsFromTopic] : null,
    profilesFetcher
  );
  const penNameMap: Record<string, string> = penNameData?.penNameMap || {};
  const userIconMap: Record<string, string> = penNameData?.userIconMap || {};

  const getDisplayName = useCallback(
    (authorEmail: string | null | undefined, authorName: string) => {
      if (authorEmail && penNameMap[authorEmail]) {
        return penNameMap[authorEmail];
      }
      return authorName;
    },
    [penNameMap]
  );

  const getDisplayIcon = useIconUrlMap(userIconMap);

  // --- 参加者 ---
  const getReplyParticipants = useCallback(() => {
    const seen = new Set<string>();
    const participants: Array<{ key: string; name: string; icon: string | null }> = [];

    replies.forEach((reply) => {
      const key = reply.authorEmail || `name:${reply.author}`;
      if (seen.has(key)) return;
      seen.add(key);
      participants.push({
        key,
        name: getDisplayName(reply.authorEmail, reply.author),
        icon: getDisplayIcon(reply.authorEmail),
      });
    });
    return participants;
  }, [replies, getDisplayName, getDisplayIcon]);

  const getLikeParticipants = useCallback(
    (post: Post) =>
      (post.likesUserIds || []).map((userId) => {
        const isMember = userId.includes("@");
        return {
          key: userId,
          icon: isMember ? getDisplayIcon(userId) : null,
          name: isMember ? getDisplayName(userId, "部員") : "ゲスト",
        };
      }),
    [getDisplayName, getDisplayIcon]
  );

  // --- AI 分析 ---
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<TopicAnalysis | null>(null);

  const generateAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/analysis/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data?.error || "分析の生成に失敗しました");
        return;
      }
      setAnalysisResult(data as TopicAnalysis);
    } catch {
      setAnalysisError("分析の生成に失敗しました");
    } finally {
      setAnalysisLoading(false);
    }
  }, [topicId]);

  // --- ミューテーション ---
  const mutateAll = useCallback(() => {
    mutatePosts();
    mutateComments();
    mutateLikes();
  }, [mutatePosts, mutateComments, mutateLikes]);

  return {
    // データ
    topic: topicWithDetails,
    parentTopic,
    replies,
    postsLoading,
    postsError,

    // ペンネーム・アイコン
    penNameMap,
    userIconMap,
    getDisplayName,
    getDisplayIcon,

    // 参加者
    getReplyParticipants,
    getLikeParticipants,

    // AI 分析
    analysisLoading,
    analysisError,
    analysisResult,
    generateAnalysis,

    // ミューテーション
    mutateAll,
    mutatePosts,
    mutateLikes,
    mutateComments,
    likesData,
  };
}
