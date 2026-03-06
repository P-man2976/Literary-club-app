"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Heart, MessageCircle } from "lucide-react";

type Post = {
  id: string;
  author: string;
  authorEmail?: string | null;
  title: string;
  body: string;
  tag: string;
  createdAt: number;
  parentPostId?: string | null;
  isTopicPost?: number;
  likes?: number;
  comments?: Array<{ commentId: string; text: string; author: string; createdAt: number }>;
};

export default function MyContentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // ログインしていない場合はリダイレクト
  useEffect(() => {
    if (!session) {
      router.push("/");
    }
  }, [session, router]);

  // 自分の投稿を取得
  useEffect(() => {
    const fetchMyPosts = async () => {
      try {
        const res = await fetch("/api/posts");
        const allPostsData: Post[] = await res.json();
        setAllPosts(allPostsData); // 全投稿を保存（子投稿カウント用）
        
        // 自分の投稿のみをフィルタ（メールアドレスで照合）
        const myPosts = allPostsData.filter(post => post.authorEmail === session?.user?.email);
        
        // 各投稿のコメントといいね情報を取得
        const postsWithDetails = await Promise.all(myPosts.map(async (post) => {
          const [cRes, lRes] = await Promise.all([
            fetch(`/api/comments?postId=${post.id}`),
            fetch(`/api/likes?postId=${post.id}`)
          ]);
          const comments = await cRes.json();
          const likesData = await lRes.json();
          
          return { ...post, comments, likes: likesData.count };
        }));
        
        setPosts(postsWithDetails.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        setLoading(false);
      } catch (error) {
        console.error("投稿取得エラー:", error);
        setLoading(false);
      }
    };

    if (session?.user?.email) {
      fetchMyPosts();
    }
  }, [session?.user?.email]);

  // 投稿を削除
  const deletePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    
    // お題で投稿がある場合は削除不可
    if (post?.isTopicPost === 1) {
      const childCount = allPosts.filter(p => p.parentPostId === postId).length;
      if (childCount > 0) {
        alert("このお題には投稿があるため削除できません");
        return;
      }
    }
    
    if (!confirm("本当に削除しますか？")) return;
    
    try {
      const response = await fetch(`/api/posts?postId=${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("削除しました！");
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  if (!session) {
    return <div className="p-10 text-center">ログインが必要です</div>;
  }

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 max-w-2xl mx-auto border-x border-slate-200 dark:border-slate-700">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
        <Link 
          href="/settings" 
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
          aria-label="戻る"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <h1 className="text-xl font-bold">自分の投稿一覧</h1>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500">読み込み中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 dark:text-slate-500 mb-2">📭</p>
            <p className="text-slate-500 dark:text-slate-400 font-medium">投稿がありません</p>
          </div>
        ) : (
          <>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">
              全 {posts.length} 件の投稿
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {posts.map((post) => (
                <article 
                  key={post.id} 
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* タイプバッジ */}
                      <div className="flex items-center gap-2 mb-2">
                        {post.isTopicPost === 1 ? (
                          <span className="text-[10px] bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded text-purple-700 dark:text-purple-200 font-bold uppercase tracking-wider">お題</span>
                        ) : post.parentPostId ? (
                          <span className="text-[10px] bg-green-200 dark:bg-green-900 px-2 py-0.5 rounded text-green-700 dark:text-green-200 font-bold uppercase tracking-wider">投稿</span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{post.tag}</span>
                        )}
                      </div>

                      {/* タイトル */}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 break-words">{post.title}</h3>

                      {/* 本文プレビュー */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{post.body}</p>

                      {/* メタ情報 */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span className="text-xs">{new Date(post.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
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
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                        post.isTopicPost === 1 && 
                        allPosts.filter(p => p.parentPostId === post.id).length > 0
                          ? "text-gray-300 dark:text-slate-600 cursor-not-allowed"
                          : "text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
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
