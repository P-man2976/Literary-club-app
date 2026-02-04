"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

// 型定義
type Post = {
  id: number;
  author: string;
  title: string;
  body: string;
  tag: string;
};

export default function Home() {
  const { data: session, status } = useSession();
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>([]); // 👈 空の配列で初期化

  const [newPost, setNewPost] = useState<Partial<Post>>({ 
    title: "", 
    body: "", 
    tag: "創作" 
  });

  const fetchPosts = async () => {
  const res = await fetch("/api/posts");
  const data = await res.json();
  if (Array.isArray(data)) {
      setPosts(data);
    }
  };

  // ページを開いた時に実行する
  useEffect(() => {
    if (status === "authenticated") {
      fetchPosts();
    }
  }, [status]);

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
    if (!newPost.title || !newPost.body) {
      alert("ファイルを選択して、タイトルと本文が読み込まれていることを確認してください。");
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPost.title,
          body: newPost.body,
          author: session?.user?.name || "匿名部員",
          tag: newPost.tag,
        }),
      });

      if (response.ok) {
        alert("AWS DynamoDBに作品を保存しました！");
        setNewPost({ title: "", body: "", tag: "創作" }); // 入力欄リセット
      } else {
        alert("保存に失敗しました。APIの設定を確認してください。");
      }
    } catch (error) {
      console.error("Error saving post:", error);
      alert("通信エラーが発生しました。");
    }
  };

  const togglePost = (id: number) => {
    setOpenPostId(openPostId === id ? null : id);
  };

  // 1. ロード中
  if (status === "loading") return <div className="p-10 text-center text-slate-500">読み込み中...</div>;

  // 2. 未ログイン（紹介画面）
  if (!session) {
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
        {/* ...タブメニューなどはそのまま */}
      </header>

      {/* 投稿一覧（全員閲覧可能） */}
      <div className="divide-y divide-slate-200">
        {posts.map((post) => (
          <article key={post.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => togglePost(post.id)}>
             {/* 投稿内容の表示ロジック */}
             <div className="divide-y divide-slate-200">
                {posts.map((post) => (
                  <article key={post.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => togglePost(post.id)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-slate-900">{post.author}</span>
                      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">{post.tag}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">{post.title}</h2>
                    
                    {openPostId === post.id ? (
                      <div className="mt-4 p-4 bg-slate-100 rounded-lg border-l-4 border-blue-500 shadow-inner">
                        <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-medium">
                          {post.body}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-600 text-sm font-medium">
                        クリックして続きを読む...
                      </p>
                    )}
                  </article>
                ))}
              </div>
             
             {/* コメント欄（閲覧は全員、投稿はログイン必須） */}
             {openPostId === post.id && (
               <div className="mt-4 pt-4 border-t border-slate-200">
                 <p className="text-xs font-bold text-slate-400 mb-2">コメント</p>
                 {/* ログイン時のみコメント入力欄を表示 */}
                 {session ? (
                   <div className="flex gap-2">
                     <input type="text" placeholder="感想を書く..." className="flex-1 text-sm border rounded-full px-4 py-1" />
                     <button className="text-blue-600 font-bold text-sm">送信</button>
                   </div>
                 ) : (
                   <p className="text-xs text-slate-500 italic">コメントするにはログインが必要です</p>
                 )}
               </div>
             )}
          </article>
        ))}
      </div>

      {/* 投稿エリア（ログイン済みユーザーのみ表示） */}
      {session && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-2xl max-w-2xl mx-auto z-20">
          {/* ...ファイルアップロードのロジック */}
        </div>
      )}
    </main>
    );
  }

  // 3. ログイン済み（メイン画面：ここにトグルなどを戻す！）
  return (
    <main className="min-h-screen bg-white text-slate-900 max-w-2xl mx-auto border-x border-slate-200 shadow-sm">
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 p-4 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">文芸部ポータル</h1>
          
          {/* 右上のユーザーアイコン */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Member</p>
              <p className="text-xs font-bold text-slate-900">{session.user?.name}</p>
            </div>
            
            {/* アイコン画像 */}
            <Link href="/settings" className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-slate-100 hover:border-blue-500 transition-all block">
              {session.user?.image ? (
                <img src={session.user.image} alt="User Icon" className="object-cover" />
              ) : (
                <div className="bg-slate-200 w-full h-full flex items-center justify-center text-slate-500">
                  {session.user?.name?.charAt(0)}
                </div>
              )}
            </Link>
          </div>
        </div>

        <div className="flex mt-4 justify-around text-sm font-bold">
          <div className="text-blue-600 border-b-2 border-blue-600 pb-2">タイムライン</div>
          <div className="text-slate-400 hover:text-slate-600 cursor-not-allowed">メンバー</div>
          <div className="text-slate-400 hover:text-slate-600 cursor-not-allowed">お題</div>
        </div>
      </header>

      {/* 投稿一覧 */}
      

      {/* 余白確保（下の固定エリアで隠れないように） */}
      
    </main>
  );
}

