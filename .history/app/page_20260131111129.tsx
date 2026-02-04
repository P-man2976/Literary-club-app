"use client"; // クライアントサイドでの動き（クリックなど）がある場合に必要です

import { useState } from "react";

export default function Home() {
  // 現在開いている投稿のIDを記録する「State」
  // nullなら何も開いていない、数字が入っていればそのIDの投稿が開いている
  const [openPostId, setOpenPostId] = useState<number | null>(null);

  // 仮の投稿データ（後でデータベースと繋ぎます）
  const posts = [
    { id: 1, author: "久保田", title: "雨の日の放課後", body: "（ここに本文が入ります...）窓の外は灰色で、アスファルトの匂いが鼻を突く。部室には私一人しかいない。", comments: 3, tag: "今週のお題" },
    { id: 2, author: "部員A", title: "無題", body: "（ここに本文が入ります...）プログラミングと文学の共通点は、どちらも「言語」を扱っている点にある。", comments: 0, tag: "コラム" },
    { id: 3, author: "部員B", title: "深夜のデバッグ", body: "（ここに本文が入ります...）セミコロン一つで世界が止まる。私の人生もそんなものかもしれない。", comments: 5, tag: "創作" },
  ];

  const togglePost = (id: number) => {
    // すでに開いているIDをもう一度クリックしたら閉じる(nullにする)
    setOpenPostId(openPostId === id ? null : id);
  };

  return (
    <main className="min-h-screen bg-white max-w-2xl mx-auto border-x border-slate-200">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4">
        <h1 className="text-xl font-bold">文芸部ポータル</h1>
        {/* タブ切り替え（Twitter風） */}
        <div className="flex mt-4 justify-around text-sm font-bold text-slate-500">
          <div className="text-blue-600 border-b-2 border-blue-600 pb-2 cursor-pointer">タイムライン</div>
          <div className="hover:text-slate-900 cursor-pointer"></div>
          <div className="hover:text-slate-900 cursor-pointer">ジャンル別</div>
        </div>
      </header>

      {/* 投稿一覧（タイムライン） */}
      <div className="divide-y divide-slate-200">
        {posts.map((post) => (
          <article key={post.id} className="p-4 hover:bg-slate-50 transition cursor-pointer" onClick={() => togglePost(post.id)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900">{post.author}</span>
              <span className="text-sm text-slate-500">@{post.author.toLowerCase()}</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{post.tag}</span>
            </div>
            <h2 className="text-lg font-bold mb-1">{post.title}</h2>
            {/* 🔽 Stateによって表示を切り替える部分 */}
            {openPostId === post.id ? (
              <div className="mt-4 p-4 bg-slate-100 rounded-lg border-l-4 border-blue-500 animate-in fade-in duration-300">
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {post.body}
                  {"\n\n"}(長い文章がここに流し込まれるイメージです...)
                </p>
                <div className="mt-4 pt-4 border-t border-slate-300">
                  <span>👍いいね</span>
                  <p className="text-sm font-bold text-slate-500 mb-2">💬 コメント</p>
                  <input 
                    type="text" 
                    placeholder="匿名でコメントする..." 
                    className="w-full p-2 text-sm border rounded"
                    onClick={(e) => e.stopPropagation()} // 入力欄クリックで閉じないように
                  />
                </div>
              </div>
            ) : (
              <p className="text-slate-500 line-clamp-1 text-sm">
                クリックして続きを読む...
              </p>
            )}
          </article>
        ))}
      </div>

      {/* 投稿ボタン（右下に固定） */}
      <button className="fixed bottom-8 right-[calc(50%-300px)] w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-600">
        ＋
      </button>
    </main>
  );
}