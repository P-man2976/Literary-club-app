import { useMemo, useCallback } from "react";
import useSWR from "swr";
import type { Post, Comment } from "@/app/types/post";
import { fetcher, profilesFetcher } from "@/app/lib/fetchers";
import { useIconUrlMap } from "@/app/hooks/useIconUrl";

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
  const allPostIds = useMemo(
    () => [topicId, ...rawReplies.map((r) => r.id)],
    [topicId, rawReplies]
  );

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
  const commentsByPostId = useMemo((): Record<string, Comment[]> => {
    if (!commentsData) return {};
    // 単一postId の場合は配列が直接返る
    if (Array.isArray(commentsData)) {
      return { [topicId]: commentsData };
    }
    // 複数postIds の場合は { postId: Comment[] } のオブジェクト
    return commentsData;
  }, [commentsData, topicId]);

  // いいねをpostIdでマッピング
  const likesByPostId = useMemo((): Record<string, string[]> => {
    if (!likesData) return {};
    // 単一postId の場合は { count, userIds } が返る
    if (likesData.userIds) {
      return {
        [topicId]: Array.isArray(likesData.userIds) ? likesData.userIds : [],
      };
    }
    // 複数postIds の場合は { postId: string[] }
    return likesData;
  }, [likesData, topicId]);

  // topic + comments + likes をマージ
  const topicWithDetails = useMemo(() => {
    if (!topic) return null;
    return {
      ...topic,
      comments: commentsByPostId[topic.id] || [],
      likesUserIds: likesByPostId[topic.id] || [],
    };
  }, [topic, commentsByPostId, likesByPostId]);

  // replies + comments + likes をマージ
  const replies = useMemo(
    () =>
      rawReplies.map((reply) => ({
        ...reply,
        comments: commentsByPostId[reply.id] || [],
        likesUserIds: likesByPostId[reply.id] || [],
      })),
    [rawReplies, commentsByPostId, likesByPostId]
  );

  // --- ペンネーム・アイコン ---
  const emailsFromTopic = useMemo(() => {
    const topicEmails = topic?.authorEmail ? [topic.authorEmail] : [];
    const replyEmails = rawReplies
      .map((r) => r.authorEmail)
      .filter((e): e is string => !!e);
    const commentEmails = Object.values(commentsByPostId)
      .flat()
      .map((c) => c.authorEmail)
      .filter((e): e is string => !!e);
    const likeEmails = Object.values(likesByPostId)
      .flat()
      .filter((id) => id.includes("@"));

    return [...new Set([...topicEmails, ...replyEmails, ...commentEmails, ...likeEmails])].sort();
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
  const replyParticipants = useMemo(() => {
    const seen = new Set<string>();
    return replies.reduce<Array<{ key: string; name: string; icon: string | null }>>(
      (acc, reply) => {
        const key = reply.authorEmail || `name:${reply.author}`;
        if (seen.has(key)) return acc;
        seen.add(key);
        acc.push({
          key,
          name: getDisplayName(reply.authorEmail, reply.author),
          icon: getDisplayIcon(reply.authorEmail),
        });
        return acc;
      },
      []
    );
  }, [replies, getDisplayName, getDisplayIcon]);

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
    replyParticipants,

    // ミューテーション
    mutateAll,
    mutatePosts,
    mutateComments,
    mutateLikes,
  };
}
