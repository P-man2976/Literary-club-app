"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

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
  
  const [newPost, setNewPost] = useState<Partial<Post>>({ 
    title: "", 
    body: "", 
    tag: "創作" 
  });
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
      <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-serif mb-4 italic text-blue-400">文芸部 Portal</h1>
        <p className="text-slate-400 mb-8 text-center max-w-sm">
          言葉を紡ぎ、共有し、高め合う。
        </p>
        <button 
          onClick={() => signIn("google")}
          className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition"
        >
          Googleでログイン
        </button>
      </main>
    );
  }

  // 3. ログイン済み（メイン画面：ここにトグルなどを戻す！）
  return (
    <main className="min-h-screen bg-white text-slate-900 max-w-2xl mx-auto border-x border-slate-200 shadow-sm">
      <header className="sticky top-0 bg-white border-b border-slate-200 p-4 z-10">
        <h1 className="text-xl font-extrabold text-slate-900">文芸部ポータル</h1>
        <div className="flex mt-4 justify-around text-sm font-bold">
          <div className="text-blue-600 border-b-2 border-blue-600 pb-2">タイムライン</div>
          <div className="text-slate-500">メンバー</div>
          <div className="text-slate-500">今週のお題</div>
        </div>
      </header>

      {/* 投稿一覧 */}
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

      {/* 余白確保（下の固定エリアで隠れないように） */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-6 shadow-2xl max-w-2xl mx-auto z-20">
        <p className="text-xs font-black text-slate-700 mb-3 uppercase tracking-wider">
          【部員専用】作品をAWSに投稿する
        </p>
        <div className="flex flex-col gap-3">
          <input 
            type="file" 
            accept=".txt" 
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors"
          />
          
          {newPost.title && (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-sm font-bold text-blue-900 truncate">
                準備完了: {newPost.title}
              </span>
              <button 
                onClick={saveToAWS}
                className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-bold hover:bg-green-700"
              >
                保存を実行
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

