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
  
  // 仮のデータ（以前のもの）
  const posts: Post[] = [
    { id: 1, author: "久保田", title: "雨の日の放課後", body: "窓の外は灰色で...", tag: "今週のお題" },
    { id: 2, author: "部員A", title: "無題", body: "プログラミングと文学...", tag: "コラム" },
  ];

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
    <main className="min-h-screen bg-slate-50 max-w-2xl mx-auto border-x border-slate-200">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 z-10">
        <h1 className="text-xl font-bold">文芸部ポータル</h1>
        <div className="flex mt-4 justify-around text-sm font-bold text-slate-500">
          <div className="text-blue-600 border-b-2 border-blue-600 pb-2">タイムライン</div>
          <div>メンバー</div>
          <div>今週のお題</div>
        </div>
      </header>

      {/* 投稿一覧 */}
      <div className="divide-y divide-slate-200 bg-white">
        {posts.map((post) => (
          <article key={post.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => togglePost(post.id)}>
             {/* 既存の表示ロジック */}
             <div className="flex items-center gap-2 mb-1">
               <span className="font-bold">{post.author}</span>
               <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{post.tag}</span>
             </div>
             <h2 className="text-lg font-bold">{post.title}</h2>
             {openPostId === post.id ? (
               <div className="mt-4 p-4 bg-slate-50 rounded border-l-4 border-blue-500">
                 <p className="whitespace-pre-wrap">{post.body}</p>
               </div>
             ) : (
               <p className="text-slate-500 text-sm">クリックして読む</p>
             )}
          </article>
        ))}
      </div>

      {/* 投稿エリア（仮） */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-2xl mx-auto">
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase">【部員専用】作品をアップロード</p>
        <input 
          type="file" 
          accept=".txt,.pdf" 
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {newPost.title && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
            ✅ 読み込み済み: <strong>{newPost.title}</strong>
          </div>
        )}
      </div>
    </main>
  );
}

