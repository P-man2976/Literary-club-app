"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) return <div className="p-10 text-center">ログインが必要です</div>;

  return (
    <main className="min-h-screen bg-slate-50 max-w-2xl mx-auto border-x border-slate-200">
      {/* ヘッダー: 戻るボタン付き */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center gap-4">
        <Link 
          href="/" 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          aria-label="戻る"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">設定</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* プロフィール設定セクション */}
        <section>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">プロフィール</h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold">名前 / アイコン</p>
                <p className="text-slate-900 font-medium">{session.user?.name}</p>
              </div>
              <img src={session.user?.image || ""} className="w-12 h-12 rounded-full border border-slate-200" alt="" />
            </div>
            <div className="p-4 flex items-center justify-between group cursor-not-allowed">
              <div>
                <p className="text-xs text-slate-500 font-bold">ペンネーム</p>
                <p className="text-slate-400">未設定（実装予定）</p>
              </div>
              <span className="text-slate-300">→</span>
            </div>
          </div>
        </section>

        {/* コンテンツ管理セクション */}
        <section>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">コンテンツ管理</h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            <button 
              onClick={() => router.push("/settings/my-content")}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 text-left transition-colors"
            >
              <div>
                <p className="text-slate-900 font-bold">自分の投稿一覧</p>
                <p className="text-xs text-slate-500">削除・閲覧数の確認</p>
              </div>
              <span className="text-slate-400">→</span>
            </button>
          </div>
        </section>

        {/* アカウント操作 */}
        <section>
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full p-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl border border-red-100 transition-colors text-center"
          >
            ログアウト
          </button>
        </section>
      </div>
    </main>
  );
}