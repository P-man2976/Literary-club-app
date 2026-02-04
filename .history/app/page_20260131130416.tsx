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
  likes?: number;      // 👈 これを追加
};

export default function Home() {
  const { data: session, status } = useSession();
  const [openPostId, setOpenPostId] = useState<string | null>(null); // stringに変更
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [isFormOpen, setIsFormOpen] = useState(false);
  // 1. ローカルでのいいね状態を管理するState
  const [likedPosts, setLikedPosts] = useState<string[]>([]);

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    const postsData: Post[] = await res.json();
    
    if (Array.isArray(postsData)) {
      const postsWithAll = await Promise.all(postsData.map(async (post) => {
        // コメントといいねを並列で取得
        const [cRes, lRes] = await Promise.all([
          fetch(`/api/comments?postId=${post.id}`),
          fetch(`/api/likes?postId=${post.id}`)
        ]);
        const comments = await cRes.json();
        const likesData = await lRes.json();
        
        return { ...post, comments, likes: likesData.count };
      }));
      setPosts(postsWithAll);
    }
  };
  // ページを開いた時に実行する
  useEffect(() => {
    // ログイン・未ログインに関わらず投稿を取得する
    fetchPosts();
  }, []);

  // 2. 初期化時にLocalStorageから既読（いいね済み）リストを読み込む
  useEffect(() => {
    const savedLikes = localStorage.getItem("lit-club-liked-ids");
    if (savedLikes) {
      setLikedPosts(JSON.parse(savedLikes));
    }
    fetchPosts();
  }, []);

  // 3. いいね実行関数
  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isLiked = likedPosts.includes(postId);
    const userId = session?.user?.email || "guest";

    // メソッドを切り替える (あればDELETE、なければPOST)
    const method = isLiked ? "DELETE" : "POST";

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          postId, 
          userId: session?.user?.email || "guest" // API側でIP識別も併用すると最強
        }),
      });

      if (response.ok) {
        // LocalStorageに保存
        const newLikedPosts = [...likedPosts, postId];
        setLikedPosts(newLikedPosts);
        localStorage.setItem("lit-club-liked-ids", JSON.stringify(newLikedPosts));
        
        fetchPosts(); // 数値を更新
      }
    } catch (error) {
      console.error(error);
    }
  };

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
          <article 
            key={post.id} 
            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors" 
            onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)}
          >
            {/* 1. 上部：投稿者情報と「いいね」ボタン */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{post.author}</span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">{post.tag}</span>
              </div>

              {/* 2. いいねボタン (LocalStorage & パターンC) */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleLike(post.id, e)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300 ${
                    likedPosts.includes(post.id) 
                      ? "text-pink-500 bg-pink-50" 
                      : "text-slate-400 hover:text-pink-400 hover:bg-slate-100"
                  }`}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="18" height="18" 
                    viewBox="0 0 24 24" 
                    fill={likedPosts.includes(post.id) ? "currentColor" : "none"} 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                  <span className="text-xs font-black">{post.likes || 0}</span>
                </button>

                {/* コメント数アイコン（表示のみ） */}
                <div className="flex items-center gap-1 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9A9 9 0 1 1 5.9 5.9l1.1 1.1"/></svg>
                  <span className="text-xs font-bold">{post.comments?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* 3. タイトル */}
            <h2 className="text-lg font-bold text-slate-900 mb-1">{post.title}</h2>
            
            {/* 4. 本文表示（クリックで開閉） */}
            {openPostId === post.id ? (
              <>
                <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner animate-in fade-in zoom-in-95 duration-200">
                  <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-medium text-sm sm:text-base">
                    {post.body}
                  </p>
                </div>
                
                {/* コメントセクション */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Reader's Feedback</p>
                  
                  {/* 保存済みのコメント一覧 */}
                  <div className="space-y-3 mb-6">
                    {post.comments && post.comments.length > 0 ? (
                      post.comments.map((comment) => (
                        <div key={comment.commentId} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-blue-600">{comment.author}</span>
                            <span className="text-[10px] text-slate-300">
                              {new Date(comment.createdAt).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700">{comment.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">まだ感想はありません。最初の読者になりましょう！</p>
                    )}
                  </div>

                  {/* コメント入力欄 */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="作品に感想を送る..."
                      value={commentTexts[post.id] || ""}
                      onChange={(e) => setCommentTexts({ ...commentTexts, [post.id]: e.target.value })}
                      className="flex-1 text-sm border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                      onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        saveComment(post.id);
                      }}
                      className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      送信
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-xs font-medium">クリックして作品を読む...</p>
            )}
          </article>
        ))}
      </div>

      {/* 投稿エリア（ログイン時のみ） */}
      {/* 右下の投稿ボタン (FAB) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
        {/* 投稿フォーム本体（開いている時だけ表示） */}
        {isFormOpen && session && (
          <div className="mb-2 w-72 sm:w-80 bg-white border border-slate-200 p-5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-black text-slate-700 uppercase">作品を投稿</p>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <input 
              type="file" 
              accept=".txt" 
              onChange={handleFileChange} 
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            
            {newPost.title && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Ready to Upload</p>
                <p className="text-sm font-bold text-blue-900 truncate mb-3">{newPost.title}</p>
                <button 
                  onClick={async () => {
                    await saveToAWS();
                    setIsFormOpen(false); // 送信後に閉じる
                  }} 
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
                >
                  保存を実行
                </button>
              </div>
            )}
          </div>
        )}

        {/* 丸いメインボタン */}
        <button
          onClick={() => {
            if (session) {
              setIsFormOpen(!isFormOpen);
            } else {
              signIn("google"); // 未ログインならログインさせる
            }
          }}
          className={`${
            session ? "bg-blue-600 shadow-blue-200" : "bg-slate-900 shadow-slate-200"
          } h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 group`}
        >
          {isFormOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              {!session && <span className="absolute -top-10 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">ログインして投稿</span>}
            </div>
          )}
        </button>
      </div>
    </main>
  );
}

