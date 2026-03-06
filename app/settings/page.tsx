"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration対策
  useEffect(() => {
    setMounted(true);
  }, []);

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

        {/* テーマ設定セクション */}
        <section>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">テーマ</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
            {mounted && (
              <>
                <button 
                  onClick={() => setTheme("light")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                    theme === "light" 
                      ? "bg-blue-50 dark:bg-blue-950" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/>
                      <line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                    <div>
                      <p className={`font-bold ${theme === "light" ? "text-blue-600" : "text-slate-900 dark:text-white"}`}>ライト</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">明るいテーマ</p>
                    </div>
                  </div>
                  {theme === "light" && <span className="text-blue-600">✓</span>}
                </button>
                <button 
                  onClick={() => setTheme("dark")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                    theme === "dark" 
                      ? "bg-blue-50 dark:bg-blue-950" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                    <div>
                      <p className={`font-bold ${theme === "dark" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>ダーク</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">暗いテーマ</p>
                    </div>
                  </div>
                  {theme === "dark" && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                </button>
                <button 
                  onClick={() => setTheme("system")}
                  className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                    theme === "system" 
                      ? "bg-blue-50 dark:bg-blue-950" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-400">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="2" y1="20" x2="22" y2="20"/>
                    </svg>
                    <div>
                      <p className={`font-bold ${theme === "system" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}>端末の設定に合わせる</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">システムのテーマに従う</p>
                    </div>
                  </div>
                  {theme === "system" && <span className="text-blue-600 dark:text-blue-400">✓</span>}
                </button>
              </>
            )}
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