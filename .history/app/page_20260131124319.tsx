"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

// 型定義
type Comment = {
  commentId: string;
  text: string;
  author: string;
  createdAt: number;
};
type Post = {
  id: string;
  author: string;
  title: string;
  body: string;
  tag: string;
  createdAt: number;
  comments?: Comment[]; // オプショナルで追加
};

export default function Home() {
  const { data: session, status } = useSession();
  const [openPostId, setOpenPostId] = useState<string | null>(null); // stringに変更
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    const postsData: Post[] = await res.json();
    
    if (Array.isArray(postsData)) {
      // 各投稿に対してコメントを取得する（並列実行）
      const postsWithComments = await Promise.all(postsData.map(async (post) => {
        const cRes = await fetch(`/api/comments?postId=${post.id}`);
        const cData = await cRes.json();
        return { ...post, comments: cData };
      }));
      setPosts(postsWithComments);
    }
  };
  // ページを開いた時に実行する
  useEffect(() => {
    // ログイン・未ログインに関わらず投稿を取得する
    fetchPosts();
  }, []);

  // 1. コメント入力用のStateを投稿IDごとに管理
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  // 2. コメント保存関数
  const saveComment = async (postId: string) => {
    const text = commentTexts[postId];
    if (!text) return;

    try {
      // ※API側でコメントを受け取れるようにする必要があります（後述）
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId,
          text: text,
          author: session?.user?.name || "匿名部員", // ログインしてなければ「匿名部員」
        }),
      });

      if (response.ok) {
        setCommentTexts({ ...commentTexts, [postId]: "" });
        alert("感想を送信しました！");
        fetchPosts(); // コメント反映のために再取得
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // ファイル名（拡張子抜き）をタイトルに自動セットする
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    if (file.type === "text/plain") {
      const text = await file.text();
      setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
    } else if (file.type === "application/pdf") {
      // PDFは後でライブラリを入れるので、今はとりあえずタイトルだけ
      setNewPost((prev) => ({ ...prev, title: fileName, body: "PDF解析機能は実装中です..." }));
    }
  };
  
  const saveToAWS = async () => {
    if (!newPost.title || !newPost.body) return;
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPost, author: session?.user?.name || "匿名部員" }),
      });
      if (response.ok) {
        alert("保存しました！");
        setNewPost({ title: "", body: "", tag: "創作" });
        fetchPosts(); // リストを更新
      }
    } catch (error) { console.error(error); }
  };


  // 1. ロード中
  if (status === "loading") return <div className="p-10 text-center text-slate-500">読み込み中...</div>;

  // 2. 未ログイン（紹介画面）
  return (
    <main className="min-h-screen bg-white text-slate-900 max-w-2xl mx-auto border-x border-slate-200 shadow-sm pb-40">
      {/* ヘッダー */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 p-4 z-30">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-slate-900">文芸部ポータル</h1>
            
            {session ? (
              /* ログイン済み：設定へのリンク */
              <Link href="/settings" className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-slate-100">
                <img src={session.user?.image || ""} alt="" className="object-cover" />
              </Link>
            ) : (
              /* 未ログイン：ログインボタンを表示 */
              <button 
                onClick={() => signIn("google")}
                className="text-xs bg-blue-600 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-700 transition"
              >
                ログイン
              </button>
            )}
          </div>
        </header>

      {/* 投稿一覧 */}
      <div className="divide-y divide-slate-200">
        {posts.map((post) => (
          <article key={post.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-slate-900">{post.author}</span>
              <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">{post.tag}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{post.title}</h2>
            
            {openPostId === post.id ? (
              <>
                <div className="mt-4 p-4 bg-slate-100 rounded-lg border-l-4 border-blue-500 shadow-inner">
                  <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-medium">{post.body}</p>
                </div>
                {/* コメント欄セクション */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-400 mb-2">コメント</p>
                  {/* 👇 保存済みのコメントを表示 */}
                  <div className="space-y-3 mb-4">
                    {post.comments && post.comments.length > 0 ? (
                      post.comments.map((comment) => (
                        <div key={comment.commentId} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-700">{comment.author}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(comment.createdAt).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800">{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">まだ感想はありません。最初の読者になりましょう！</p>
                    )}
                  </div>

                  {/* 入力欄（ここは既存のまま、少しだけ調整） */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="匿名で感想を書く..."
                      value={commentTexts[post.id] || ""}
                      onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                      className="flex-1 text-sm border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        saveComment(post.id);
                      }}
                      className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-600 transition-colors"
                    >
                      送信
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-600 text-sm font-medium">クリックして読む...</p>
            )}
          </article>
        ))}
      </div>

      {/* 投稿エリア（ログイン時のみ） */}
      {session && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-2xl max-w-2xl mx-auto z-20">
          <p className="text-xs font-black text-slate-700 mb-3 uppercase">【部員専用】作品をAWSに投稿する</p>
          <input type="file" accept=".txt" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white" />
          {newPost.title && (
            <div className="mt-3 flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-sm font-bold text-blue-900 truncate">準備完了: {newPost.title}</span>
              <button onClick={saveToAWS} className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-bold">保存を実行</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

