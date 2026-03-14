"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useCallback } from "react";
import { Heart, MessageCircle } from "lucide-react";
import useSWR from "swr";
import type { Comment } from "@/app/types/post";
import { fetcher } from "@/app/lib/fetchers";
import { formatDateTime } from "@/app/lib/formatUtils";
import { usePosts } from "@/app/hooks/usePosts";
import { usePostMutations } from "@/app/hooks/usePostMutations";
import { useUserProfile } from "@/app/hooks/useUserProfile";

export default function MyContentPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const email = session?.user?.email;

  const { allPosts, postsLoading, mutatePosts } = usePosts();
  const { penName } = useUserProfile(session);
  const { deletePost: triggerDelete } = usePostMutations({
    session,
    penName,
    mutatePosts,
  });

  // 自分の投稿をフィルタ
  const myPosts = useMemo(
    () =>
      allPosts
        .filter((p) => p.authorEmail === email)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [allPosts, email]
  );

  const myPostIds = useMemo(() => myPosts.map((p) => p.id), [myPosts]);

  // コメント一括取得
  const commentsKey = useMemo(() => {
    if (myPostIds.length === 0) return null;
    return `/api/comments?postIds=${myPostIds.join(",")}`;
  }, [myPostIds]);

  const { data: commentsData } = useSWR(commentsKey, fetcher, {
    revalidateOnFocus: false,
  });

  const commentsByPostId = useMemo((): Record<string, Comment[]> => {
    if (!commentsData) return {};
    if (Array.isArray(commentsData)) {
      return myPostIds.length === 1 ? { [myPostIds[0]]: commentsData } : {};
    }
    return commentsData;
  }, [commentsData, myPostIds]);

  // いいね一括取得
  const likesKey = useMemo(() => {
    if (myPostIds.length === 0) return null;
    return `/api/likes?postIds=${myPostIds.join(",")}`;
  }, [myPostIds]);

  const { data: likesData } = useSWR(likesKey, fetcher, {
    revalidateOnFocus: false,
  });

  const likeCountByPostId = useMemo((): Record<string, number> => {
    if (!likesData) return {};
    // 単一postIdの場合
    if (likesData.count !== undefined) {
      return myPostIds.length === 1 ? { [myPostIds[0]]: likesData.count } : {};
    }
    // 複数postIdsの場合: { postId: string[] }
    const result: Record<string, number> = {};
    for (const [id, userIds] of Object.entries(likesData)) {
      result[id] = Array.isArray(userIds) ? userIds.length : 0;
    }
    return result;
  }, [likesData, myPostIds]);

  // 投稿にコメント数・いいね数をマージ
  const posts = useMemo(
    () =>
      myPosts.map((post) => ({
        ...post,
        comments: commentsByPostId[post.id] || [],
        likes: likeCountByPostId[post.id] || 0,
      })),
    [myPosts, commentsByPostId, likeCountByPostId]
  );

  // 子投稿がある場合は削除不可チェック → usePostMutations の deletePost を呼ぶ
  const deletePost = useCallback(
    (postId: string) => {
      const post = myPosts.find((p) => p.id === postId);

      if (post?.isTopicPost === 1) {
        const childCount = allPosts.filter(
          (p) => p.parentPostId === postId
        ).length;
        if (childCount > 0) {
          alert("このお題には投稿があるため削除できません");
          return;
        }
      }

      triggerDelete(postId, () => alert("削除しました！"));
    },
    [myPosts, allPosts, triggerDelete]
  );

  // ログインしていない場合はリダイレクト
  if (!session) {
    router.push("/");
    return <div className="p-10 text-center">ログインが必要です</div>;
  }

  return (
    <main className="min-h-screen bg-white chrome:bg-slate-950 text-slate-900 chrome:text-slate-100 max-w-2xl mx-auto border-x border-slate-200 chrome:border-slate-700">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white/90 chrome:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 chrome:border-slate-700 p-4 flex items-center gap-4">
        <Link 
          href="/settings" 
          className="p-2 hover:bg-slate-100 chrome:hover:bg-slate-800 rounded-full transition-colors text-slate-600 chrome:text-slate-400"
          aria-label="戻る"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <h1 className="text-xl font-bold">自分の投稿一覧</h1>
      </header>

      <div className="p-4 space-y-4">
        {postsLoading ? (
          <div className="text-center py-10 text-slate-400 chrome:text-slate-500">読み込み中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 chrome:text-slate-500 mb-2">📭</p>
            <p className="text-slate-500 chrome:text-slate-400 font-medium">投稿がありません</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-500 chrome:text-slate-400 font-medium mb-4">
              全 {posts.length} 件の投稿
            </div>
            <div className="divide-y divide-slate-200 chrome:divide-slate-700">
              {posts.map((post) => (
                <article 
                  key={post.id} 
                  className="p-4 hover:bg-slate-50 chrome:hover:bg-slate-900 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* タイプバッジ */}
                      <div className="flex items-center gap-2 mb-2">
                        {post.isTopicPost === 1 ? (
                          <span className="text-[10px] bg-purple-200 chrome:bg-purple-900 px-2 py-0.5 rounded-sm text-purple-700 chrome:text-purple-200 font-bold uppercase tracking-wider">お題</span>
                        ) : post.parentPostId ? (
                          <span className="text-[10px] bg-green-200 chrome:bg-green-900 px-2 py-0.5 rounded-sm text-green-700 chrome:text-green-200 font-bold uppercase tracking-wider">投稿</span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 chrome:bg-slate-800 px-2 py-0.5 rounded-sm text-slate-500 chrome:text-slate-400 font-bold uppercase tracking-wider">{post.tag}</span>
                        )}
                      </div>

                      {/* タイトル */}
                      <h3 className="text-lg font-bold text-slate-900 chrome:text-slate-100 mb-2 wrap-break-word">{post.title}</h3>

                      {/* 本文プレビュー */}
                      <p className="text-sm text-slate-600 chrome:text-slate-400 line-clamp-2 mb-3">{post.body}</p>

                      {/* メタ情報 */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 chrome:text-slate-400 mb-3">
                        <span className="text-xs">{formatDateTime(post.createdAt)}</span>
                        <span className="flex items-center gap-1"><Heart size={14} /> {post.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={14} /> {post.comments?.length || 0}</span>
                      </div>
                    </div>

                    {/* 削除ボタン */}
                    <button
                      onClick={() => deletePost(post.id)}
                      disabled={
                        post.isTopicPost === 1 && 
                        allPosts.filter(p => p.parentPostId === post.id).length > 0
                      }
                      className={`shrink-0 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                        post.isTopicPost === 1 && 
                        allPosts.filter(p => p.parentPostId === post.id).length > 0
                          ? "text-gray-300 chrome:text-slate-600 cursor-not-allowed"
                          : "text-red-400 hover:text-red-600 hover:bg-red-50 chrome:hover:bg-red-900/30"
                      }`}
                      title={
                        post.isTopicPost === 1 && 
                        allPosts.filter(p => p.parentPostId === post.id).length > 0
                          ? "このお題に投稿があるため削除できません"
                          : "削除"
                      }
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
