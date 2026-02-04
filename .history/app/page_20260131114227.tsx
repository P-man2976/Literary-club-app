"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { data: session, status } = useSession(); // 🆕 ログイン情報を取得

  // 1. ロード中（認証チェック中）
  if (status === "loading") return <p className="p-10">読み込み中...</p>;

  // 2. 未ログイン（匿名）の場合の画面
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h1 className="text-2xl font-bold mb-4">文芸部ポータル（閲覧モード）</h1>
        <p className="mb-6 text-slate-600">投稿するには部員アカウントでログインしてください。</p>
        <div className="flex gap-4">
           <button onClick={() => signIn("google")} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">
             Googleでログイン
           </button>
           {/* 「匿名で閲覧」ボタンは、単にこの画面を閉じるか、状態を「閲覧のみ」にする処理 */}
        </div>
      </main>
    );
  }

  // 3. ログイン済みの画面
  return (
    <main className="max-w-2xl mx-auto p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">文芸部タイムライン</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm">{session.user?.name}さん</span>
          <button onClick={() => signOut()} className="text-xs text-red-500 underline">ログアウト</button>
        </div>
      </header>

      {/* ログインユーザーだけが「＋」ボタンを見れる、または押せるようにする */}
      {session.user?.email?.endsWith("@gmail.com") ? (
         <button className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg text-2xl">＋</button>
      ) : (
         <p className="text-center text-sm text-slate-400">※部員のみ投稿可能です</p>
      )}

      {/* 投稿一覧の表示ロジックへ続く... */}
    </main>
  );
}