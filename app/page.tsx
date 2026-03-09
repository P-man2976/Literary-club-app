"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { getUserIconUrl } from "@/app/lib/imageUtils";
import { 
  Button, 
  Tabs, 
  Tab, 
  Spinner
} from "@heroui/react";
import { Users, AlertCircle, FileText, Target } from "lucide-react";
import { 
  HandDrawnSettingsIcon,
  LiquidMetalPostIcon,
  LiquidMetalTopicIcon,
  LiquidMetalPeopleIcon,
  ChromeSettingsIcon,
} from "@/app/components/HandDrawnIcons";
import { PostsTabContent } from "@/app/components/PostsTabContent";
import { TopicsTabContent } from "@/app/components/TopicsTabContent";
import { MembersTabContent } from "@/app/components/MembersTabContent";
import { TopicDecisionModal } from "@/app/components/TopicDecisionModal";
import { ProposalModal } from "@/app/components/ProposalModal";
import { PostCreateModal } from "@/app/components/PostCreateModal";
import { usePosts } from "@/app/hooks/usePosts";
import { useUserProfile } from "@/app/hooks/useUserProfile";

export default function Home() {
  const { data: session, status } = useSession();
  const { resolvedTheme } = useTheme();
  const isChromeTheme = resolvedTheme === "dark";
  const isLibraryTheme = resolvedTheme === "library";
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [isTopicDecisionModalOpen, setIsTopicDecisionModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "topics" | "members">("posts");

  // カスタムフック
  const {
    postsError,
    profilesError,
    postsLoading,
    mutatePosts,
  } = usePosts();

  const { userIcon } = useUserProfile(session ?? null);

  useEffect(() => {
    if (status !== "loading") {
      setSessionLoadTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSessionLoadTimedOut(true);
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  if (status === "loading" && !sessionLoadTimedOut) {
    return <div className="p-10 text-center text-gray-500">読み込み中...</div>;
  }

  if (status === "loading" && sessionLoadTimedOut) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-gray-700 font-semibold">セッション確認に時間がかかっています</p>
        <p className="text-gray-500 text-sm">通信状況により認証確認が遅れる場合があります。</p>
        <div className="flex justify-center gap-2">
          <Button color="primary" onPress={() => window.location.reload()}>
            再読み込み
          </Button>
          <Button variant="flat" onPress={() => signIn("google")}>
            ログインし直す
          </Button>
        </div>
      </div>
    );
  }

  // ローディング状態
  if (postsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-gray-500">データを読み込んでいます...</p>
      </div>
    );
  }

  // エラー状態
  if (postsError || profilesError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <AlertCircle size={48} className="text-danger mb-4" />
        <p className="text-lg font-semibold text-danger mb-2">データの取得に失敗しました</p>
        <p className="text-sm text-gray-500 mb-4">
          {postsError?.message || profilesError?.message || 'ネットワーク接続を確認してください'}
        </p>
        <Button 
          color="primary" 
          onPress={() => {
            mutatePosts();
          }}
        >
          再試行
        </Button>
      </div>
    );
  }

  return (
    <main className={`min-h-screen max-w-3xl mx-auto pb-40 relative z-10 ${isLibraryTheme ? "library-theme" : ""}`}>
      {/* ヘッダー */}
      <header className={isChromeTheme
        ? "sticky top-0 bg-gradient-to-b from-black/75 via-black/45 to-transparent backdrop-blur-md shadow-[0_4px_0_rgba(0,0,0,0.6)] p-4 z-30 mb-2"
        : "sticky top-0 bg-white shadow-[0_4px_0_rgba(0,0,0,0.6)] p-4 z-30 mb-2"
      }>
        <div className="flex justify-between items-center">
          <h1 className="site-title leading-none">
            <span className="block text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-black/80 dark:text-cyan-200">
              東京理科大学
            </span>
            <span className="block text-3xl font-black uppercase tracking-tight text-black dark:text-cyan-300">
              文芸部
            </span>
          </h1>
          
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              aria-label="設定"
              className="w-12 h-12 rounded-full border-3 border-black bg-cyan-400 flex items-center justify-center shake-hover shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] transition-all"
            >
              {isChromeTheme ? <ChromeSettingsIcon size={24} /> : <HandDrawnSettingsIcon size={22} />}
            </Link>

            {session ? (
              <Link href="/settings/profile" aria-label="アカウント設定" className="block">
                {getUserIconUrl(session.user?.email, userIcon) ? (
                  <img
                    src={getUserIconUrl(session.user?.email, userIcon) || ""}
                    alt="プロフィール"
                    className={isChromeTheme 
                      ? "w-12 h-12 rounded-full object-cover border-2 border-white shadow-[0_2px_0_rgba(255,255,255,0.4)]"
                      : "w-12 h-12 rounded-full object-cover border-3 border-black shadow-[0_4px_0_rgba(0,0,0,0.8)]"
                    }
                  />
                ) : (
                  <div className={isChromeTheme
                    ? "w-12 h-12 rounded-full bg-gray-700 border-2 border-white flex items-center justify-center"
                    : "w-12 h-12 rounded-full bg-yellow-300 border-3 border-black shadow-[0_4px_0_rgba(0,0,0,0.8)]"
                  } />
                )}
              </Link>
            ) : (
              <button 
                onClick={() => signIn("google")}
                className="h-10 px-4 rounded-full bg-pink-500 text-white font-black uppercase border-3 border-white shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.8)] transition-all shake-hover"
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <Tabs 
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as "posts" | "topics" | "members")}
        variant="underlined"
        color="primary"
        className="w-full"
        classNames={{
          base: "sticky top-[73px] w-full bg-transparent z-20 px-0 backdrop-blur-sm",
          tabList: isChromeTheme
            ? "w-full !grid !grid-cols-3 !gap-0 px-0 bg-transparent border-0 shadow-none outline-none ring-0 before:hidden after:hidden [&>*]:border-0 [&>*]:outline-none [&>*]:ring-0"
            : isLibraryTheme
              ? "w-full !grid !grid-cols-3 !gap-2 px-2 bg-[#ECE7DB]/90 backdrop-blur-md"
              : "w-full !grid !grid-cols-3 !gap-2 px-2 bg-white/20 backdrop-blur-md border border-white/40 shadow-[0_4px_0_rgba(0,0,0,0.6)]",
          cursor: isChromeTheme
            ? "hidden"
            : isLibraryTheme
              ? "w-full h-1 bg-[#8B7355]"
              : "w-full h-1 bg-black",
          tab: isChromeTheme
            ? "h-14 w-full max-w-none !mx-0 !px-0 justify-center rounded-none bg-transparent border-0 ring-0 shadow-none outline-none before:hidden after:hidden transition-all relative data-[selected=true]:font-black data-[selected=true]:bg-transparent data-[selected=true]:border-0 data-[selected=true]:ring-0 data-[selected=true]:shadow-[0_0_14px_rgba(255,255,255,0.9)]"
            : isLibraryTheme
              ? "h-14 w-full max-w-none !mx-0 !px-0 justify-center rounded-xl text-[#4A3F30] data-[selected=true]:font-black data-[selected=true]:text-[#1A1A1A] data-[selected=true]:bg-[#ECE7DB] transition-all"
              : "h-14 w-full max-w-none !mx-0 !px-0 justify-center rounded-none data-[selected=true]:font-black data-[selected=true]:text-black data-[selected=true]:bg-yellow-400 dark:data-[selected=true]:bg-pink-500 shake-hover transition-all",
          tabContent: isChromeTheme
            ? "group-data-[selected=true]:text-white group-data-[selected=false]:text-white/70 group-data-[selected=true]:drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] font-black text-lg uppercase tracking-wider"
            : isLibraryTheme
              ? "group-data-[selected=true]:text-[#1A1A1A] group-data-[selected=false]:text-[#6A5A45] font-black text-lg tracking-wider"
              : "group-data-[selected=true]:text-black group-data-[selected=false]:text-white font-black text-lg uppercase tracking-wider",
        }}
      >
        <Tab
          key="posts"
          title={
            <span className="flex items-center gap-2">
              {isChromeTheme ? (
                <FileText size={20} strokeWidth={2.5} className="text-white" />
              ) : (
                <span className="chrome-tab-icon-wrap">
                  <LiquidMetalPostIcon size={20} className="chrome-tab-icon" />
                </span>
              )}
              投稿
            </span>
          }
        >
          <PostsTabContent
            onCreatePost={() => setIsPostModalOpen(true)}
          />
        </Tab>

        <Tab
          key="topics"
          title={
            <span className="flex items-center gap-2">
              {isChromeTheme ? (
                <Target size={20} strokeWidth={2.5} className="text-white" />
              ) : (
                <span className="chrome-tab-icon-wrap">
                  <LiquidMetalTopicIcon size={20} className="chrome-tab-icon" />
                </span>
              )}
              お題
            </span>
          }
        >
          <TopicsTabContent
            onOpenTopicDecision={() => setIsTopicDecisionModalOpen(true)}
            onCreateProposal={() => setIsProposalModalOpen(true)}
          />
        </Tab>

        <Tab
          key="members"
          title={
            <span className="flex items-center gap-2">
              {isChromeTheme ? (
                <Users size={20} strokeWidth={2.5} className="text-white" />
              ) : (
                <span className="chrome-tab-icon-wrap">
                  <LiquidMetalPeopleIcon size={20} className="chrome-tab-icon" />
                </span>
              )}
              部員紹介
            </span>
          }
        >
          <MembersTabContent />
        </Tab>
      </Tabs>

      <TopicDecisionModal
        isOpen={isTopicDecisionModalOpen}
        onClose={() => setIsTopicDecisionModalOpen(false)}
      />

      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
      />

      <PostCreateModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />
    </main>
  );
}
