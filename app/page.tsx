"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { getUserIconUrl } from "@/app/lib/imageUtils";
import { 
  Button, 
  Tabs, 
  Tab, 
  Spinner
} from "@heroui/react";
import { Lightbulb, Users, AlertCircle, FileText, Target } from "lucide-react";
import { 
  HandDrawnPostIcon,
  HandDrawnTopicIcon,
  HandDrawnSettingsIcon,
  LiquidMetalPostIcon,
  LiquidMetalTopicIcon,
  LiquidMetalPeopleIcon,
  ChromeSettingsIcon,
} from "@/app/components/HandDrawnIcons";
import { PostsTabContent } from "@/app/components/PostsTabContent";
import { TopicsTabContent } from "@/app/components/TopicsTabContent";
import { MembersTabContent } from "@/app/components/MembersTabContent";
import type { Post } from "@/app/types/post";
import { usePosts } from "@/app/hooks/usePosts";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { createPostActions } from "@/app/hooks/usePostActions";
import { parseFile } from "@/app/lib/fileParser";

export default function Home() {
  const aiReadingSettingKey = "lit-club-ai-reading-enabled";
  const { data: session, status } = useSession();
  const { resolvedTheme } = useTheme();
  const isChromeTheme = resolvedTheme === "dark";
  const isLibraryTheme = resolvedTheme === "library";
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);
  const [isTopicDecisionModalOpen, setIsTopicDecisionModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "topics" | "members">("posts");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [postingMode, setPostingMode] = useState<"regular" | "topic" | "reply">("regular");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: { title: string; body: string } }>({});
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedPoolTopicId, setSelectedPoolTopicId] = useState<string | null>(null);
  const [proposalDeadline, setProposalDeadline] = useState<number | null>(null);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingProposalTitle, setEditingProposalTitle] = useState("");
  const [editingProposalBody, setEditingProposalBody] = useState("");
  const [aiReadingEnabled, setAiReadingEnabled] = useState(true);

  // カスタムフック
  const {
    allPosts,
    topicPosts,
    topicProposals,
    freePosts,
    topicReplies,
    memberProfiles,
    postsError,
    profilesError,
    postsLoading,
    mutatePosts,
    getDisplayName,
    getDisplayIcon,
    getTopicParticipants,
  } = usePosts();

  const { penName, userIcon } = useUserProfile(session ?? null);

  const actions = useMemo(
    () => createPostActions({ session: session ?? null, penName, mutatePosts }),
    [session, penName, mutatePosts]
  );

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(aiReadingSettingKey);
      setAiReadingEnabled(saved !== "0");
    } catch {
      setAiReadingEnabled(true);
    }
  }, []);

  const startEditingProposal = (proposalId: string, title: string, body: string) => {
    setEditingProposalId(proposalId);
    setEditingProposalTitle(title);
    setEditingProposalBody(body);
  };

  const cancelEditingProposal = () => {
    setEditingProposalId(null);
    setEditingProposalTitle("");
    setEditingProposalBody("");
  };

  const saveEditedProposal = async (proposalId: string) => {
    const success = await actions.saveEditedProposal(proposalId, editingProposalTitle, editingProposalBody);
    if (success) cancelEditingProposal();
  };

  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});

  const saveComment = async (postId: string) => {
    const text = commentTexts[postId];
    const success = await actions.saveComment(postId, text);
    if (success) {
      setCommentTexts({ ...commentTexts, [postId]: "" });
    }
  };

  const convertProposalToTopic = async (proposalId: string, deadline: number) => {
    const proposal = topicProposals.find(p => p.id === proposalId);
    const success = await actions.convertProposalToTopic(proposal, deadline);
    if (success) {
      setProposalDeadline(null);
      setSelectedProposalId(null);
      setIsTopicDecisionModalOpen(false);
    }
  };

  const convertPoolTopicToTopic = async (poolTopicId: string, deadline: number) => {
    const poolTopic = topicPosts.find((t) => t.id === poolTopicId && !!t.deadline && t.deadline < Date.now());
    const success = await actions.convertPoolTopicToTopic(poolTopic, deadline);
    if (success) {
      setProposalDeadline(null);
      setSelectedProposalId(null);
      setSelectedPoolTopicId(null);
      setIsTopicDecisionModalOpen(false);
    }
  };

  const saveReplyInTopic = async (topicId: string) => {
    const reply = replyTexts[topicId];
    const success = await actions.saveReplyInTopic(topicId, reply);
    if (success) {
      setReplyTexts({ ...replyTexts, [topicId]: { title: "", body: "" } });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseFile(file, setNewPost);
  };
  
  const saveToAWS = async (forceMode?: "topic" | "regular" | "reply") => {
    const success = await actions.saveToAWS(newPost, postingMode, selectedTopicId, forceMode);
    if (success) {
      setNewPost({ title: "", body: "", tag: "創作" });
      setPostingMode("regular");
      setSelectedTopicId(null);
      onClose();
    }
  };


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

  const selectedProposal = selectedProposalId
    ? topicProposals.find((proposal) => proposal.id === selectedProposalId) || null
    : null;

  const selectedPoolTopic = selectedPoolTopicId
    ? topicPosts.find((topic) => topic.id === selectedPoolTopicId) || null
    : null;

  const nowTimestamp = Date.now();
  const activeTopic = topicPosts.find((topic) => !topic.deadline || topic.deadline >= nowTimestamp) || null;
  const pastTopicsForDisplay = topicPosts.filter((topic) => (activeTopic ? topic.id !== activeTopic.id : true));

  const pastTopicPool = topicPosts.filter((topic) => !!topic.deadline && topic.deadline < nowTimestamp);
  const decisionCandidates = [
    ...topicProposals.map((candidate) => ({ ...candidate, source: "proposal" as const })),
    ...pastTopicPool.map((candidate) => ({ ...candidate, source: "pool" as const })),
  ];
  const selectedDecisionCandidate = selectedProposal || selectedPoolTopic;
  const hasDecisionCandidates = topicProposals.length > 0 || pastTopicPool.length > 0;

  const selectRandomCandidate = () => {
    if (decisionCandidates.length === 0) {
      alert("候補がまだありません");
      return;
    }

    const randomIndex = Math.floor(Math.random() * decisionCandidates.length);
    const randomCandidate = decisionCandidates[randomIndex];
    if (randomCandidate.source === "proposal") {
      setSelectedProposalId(randomCandidate.id);
      setSelectedPoolTopicId(null);
    } else {
      setSelectedPoolTopicId(randomCandidate.id);
      setSelectedProposalId(null);
    }
  };

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
            freePosts={freePosts}
            topicReplies={topicReplies}
            topicPosts={topicPosts}
            isChromeTheme={isChromeTheme}
            isLibraryTheme={isLibraryTheme}
            getDisplayIcon={getDisplayIcon}
            getDisplayName={getDisplayName}
            session={session}
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
            topicPosts={topicPosts}
            activeTopic={activeTopic}
            pastTopicsForDisplay={pastTopicsForDisplay}
            isChromeTheme={isChromeTheme}
            isLibraryTheme={isLibraryTheme}
            getDisplayIcon={getDisplayIcon}
            getDisplayName={getDisplayName}
            getTopicParticipants={getTopicParticipants}
            session={session}
            hasDecisionCandidates={hasDecisionCandidates}
            onOpenTopicDecision={() => {
              setSelectedProposalId(null);
              setSelectedPoolTopicId(null);
              setProposalDeadline(null);
              setIsTopicDecisionModalOpen(true);
            }}
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
          <MembersTabContent
            memberProfiles={memberProfiles}
            isChromeTheme={isChromeTheme}
            isLibraryTheme={isLibraryTheme}
            aiReadingEnabled={aiReadingEnabled}
            sessionEmail={session?.user?.email}
          />
        </Tab>
      </Tabs>

      {/* お題決定モーダル */}
      {isTopicDecisionModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsTopicDecisionModalOpen(false)}
        >
          <div 
            className="library-topic-modal bg-white dark:bg-gray-900 rounded-2xl border-4 border-white dark:border-green-400 shadow-[0_10px_0_rgba(0,0,0,0.9)] dark:shadow-[0_0_30px_rgba(0,255,255,0.5)] max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="library-topic-modal-header rounded-t-[14px] flex justify-between items-center border-b-4 border-black dark:border-green-400 p-6 bg-gradient-to-r from-yellow-300 to-pink-400 dark:bg-[#00FFFF]">
              <h2 className="text-2xl font-black uppercase flex items-center gap-2 text-black dark:text-gray-900">
                <HandDrawnTopicIcon size={24} />
                お題を決定
              </h2>
              <button
                onClick={() => setIsTopicDecisionModalOpen(false)}
                className="text-3xl font-black text-black dark:text-gray-900 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>

            {/* ボディ */}
            <div className="p-6 dark:bg-gray-900 dark:text-green-300">
              {!hasDecisionCandidates ? (
                <div className="text-center py-8">
                  <p className="text-xl font-black uppercase text-black dark:text-green-300">候補がまだありません</p>
                  <p className="text-sm font-bold text-black/70 dark:text-green-400 mt-2">
                    「お題」タブ右下のボタンからお題案を投稿してください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={selectRandomCandidate}
                        disabled={decisionCandidates.length === 0}
                        className="px-6 py-3 bg-orange-500 dark:bg-green-600 text-white rounded-lg font-black uppercase border-3 border-white dark:border-green-400 shadow-[0_4px_0_rgba(0,0,0,0.8)] dark:shadow-[0_0_15px_rgba(0,240,168,0.5)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] dark:hover:shadow-[0_0_25px_rgba(0,240,168,0.7)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        ランダム
                      </button>
                      <button
                        type="button"
                        disabled
                        title="AIお題作成は準備中です"
                        className="px-6 py-3 bg-sky-600 dark:bg-gray-700 text-white dark:text-gray-500 rounded-lg font-black uppercase opacity-50 cursor-not-allowed border-3 border-white dark:border-gray-600"
                      >
                        生成AI (準備中)
                      </button>
                    </div>

                    <select
                      className="w-full border border-gray-300 dark:border-green-400 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-slate-900 dark:text-green-300 font-semibold"
                      value={selectedProposalId ? `proposal:${selectedProposalId}` : selectedPoolTopicId ? `pool:${selectedPoolTopicId}` : ""}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        if (!selectedValue) {
                          setSelectedProposalId(null);
                          setSelectedPoolTopicId(null);
                          return;
                        }

                        const [source, candidateId] = selectedValue.split(":");
                        if (source === "proposal") {
                          setSelectedProposalId(candidateId || null);
                          setSelectedPoolTopicId(null);
                          return;
                        }

                        setSelectedPoolTopicId(candidateId || null);
                        setSelectedProposalId(null);
                      }}
                    >
                      <option value="">候補を選択</option>
                      {decisionCandidates.map((candidate) => (
                        <option key={`${candidate.source}-${candidate.id}`} value={`${candidate.source}:${candidate.id}`}>
                          {candidate.source === "proposal" ? "[お題案]" : "[過去お題]"} {candidate.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="datetime-local"
                    className="w-full border border-gray-300 dark:border-green-400 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-slate-900 dark:text-green-300 font-semibold"
                    onChange={(e) => {
                      if (e.target.value) {
                        setProposalDeadline(new Date(e.target.value).getTime());
                      } else {
                        setProposalDeadline(null);
                      }
                    }}
                  />

                  {selectedDecisionCandidate ? (
                    <div className="rounded-lg border border-gray-200 dark:border-green-400 bg-gray-50 dark:bg-gray-900 p-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-green-300">
                        {selectedDecisionCandidate.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-green-400 mt-1 line-clamp-4">
                        {selectedDecisionCandidate.body}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-green-400">
                      候補を選択してください。
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-green-400 p-6 dark:bg-gray-900">
              <button
                onClick={() => setIsTopicDecisionModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-green-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:shadow-[0_0_10px_rgba(0,240,168,0.5)] rounded-lg font-semibold border border-transparent dark:border-green-400 transition-all"
              >
                キャンセル
              </button>
              <button
                disabled={(!selectedProposalId && !selectedPoolTopicId) || !proposalDeadline}
                onClick={() => {
                  if (selectedProposalId && proposalDeadline) {
                    convertProposalToTopic(selectedProposalId, proposalDeadline);
                    return;
                  }
                  if (selectedPoolTopicId && proposalDeadline) {
                    convertPoolTopicToTopic(selectedPoolTopicId, proposalDeadline);
                  }
                }}
                className="px-6 py-3 bg-pink-500 dark:bg-[#00FFFF] text-white dark:text-gray-900 rounded-lg font-black uppercase border-3 border-white dark:border-green-400 shadow-[0_4px_0_rgba(0,0,0,0.8)] dark:shadow-[0_0_20px_rgba(0,255,255,0.6)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] dark:hover:shadow-[0_0_30px_rgba(0,255,255,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                この内容でお題化
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投稿モーダル */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div 
            className="bg-white rounded-2xl border-4 border-white shadow-[0_10px_0_rgba(0,0,0,0.9)] max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b-4 border-black p-6 sticky top-0 bg-gradient-to-r from-cyan-300 to-blue-400">
              <h2 className="text-2xl font-black uppercase">
                {postingMode === "topic" ? (
                  <span className="flex items-center gap-2">
                    <HandDrawnTopicIcon size={24} />
                    お題を作成
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <HandDrawnPostIcon size={24} />
                    作品を投稿
                  </span>
                )}
              </h2>
              <button
                onClick={onClose}
                className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* ボディ */}
            <div className="p-6 space-y-4">
              {postingMode === "topic" ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">お題のタイトル</label>
                    <input
                      type="text"
                      placeholder="例：【3月15日まで】夏祭り"
                      value={newPost.title || ""}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">お題の説明</label>
                    <textarea
                      placeholder="お題の説明を入力..."
                      value={newPost.body || ""}
                      onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                      rows={4}
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <input 
                      type="file" 
                      accept=".txt,.pdf,.docx" 
                      onChange={handleFileChange}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">対応形式: テキスト (.txt), PDF, Word (.docx)</p>
                  </div>
                  
                  {newPost.title && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2">タイトル</label>
                        <input
                          type="text"
                          value={newPost.title || ""}
                          onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">本文</label>
                        <textarea
                          value={newPost.body || ""}
                          onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                          rows={8}
                          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-900">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
              >
                キャンセル
              </button>
              <button 
                onClick={() => saveToAWS(postingMode)}
                disabled={!newPost.title || !newPost.body}
                className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-black uppercase border-3 border-white shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {postingMode === "topic" ? "お題を公開" : "保存を実行"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* お題案投稿モーダル */}
      {isProposalModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsProposalModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border-4 border-white shadow-[0_10px_0_rgba(0,0,0,0.9)] max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b-4 border-black p-6 bg-gradient-to-r from-yellow-300 to-orange-400">
              <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                <Lightbulb size={24} strokeWidth={3} />
                お題案を投稿
              </h2>
              <button
                onClick={() => setIsProposalModalOpen(false)}
                className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* ボディ */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">お題案タイトル</label>
                <input
                  type="text"
                  placeholder="例：夏祭りの思い出"
                  value={newPost.title || ""}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">詳細・説明</label>
                <textarea
                  placeholder="お題案の詳細や説明を入力..."
                  value={newPost.body || ""}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-3 border-t-4 border-black p-6 bg-gray-50">
              <button
                onClick={() => {
                  setIsProposalModalOpen(false);
                  setNewPost({ title: "", body: "", tag: "創作" });
                }}
                className="px-6 py-3 text-black font-black uppercase bg-gray-300 border-3 border-black rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!newPost.title || !newPost.body) {
                    alert("タイトルと内容は必須です");
                    return;
                  }
                  const proposalData = {
                    ...newPost,
                    author: penName || session?.user?.name || "匿名部員",
                    authorEmail: session?.user?.email || null,
                    tag: "お題案",
                  };
                  fetch("/api/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(proposalData),
                  }).then(async (res) => {
                    if (res.ok) {
                      alert("お題案を投稿しました！");
                      setNewPost({ title: "", body: "", tag: "創作" });
                      setIsProposalModalOpen(false);
                      await mutatePosts();
                    } else {
                      alert("投稿に失敗しました");
                    }
                  }).catch(() => {
                    alert("投稿に失敗しました");
                  });
                }}
                disabled={!newPost.title || !newPost.body}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-black uppercase border-3 border-white shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                投稿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 投稿作成モーダル（自由投稿 or お題投稿） */}
      {isPostModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsPostModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border-4 border-white shadow-[0_10px_0_rgba(0,0,0,0.9)] max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b-4 border-black p-6 bg-gradient-to-r from-purple-300 to-pink-400">
              <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                <HandDrawnPostIcon size={24} />
                投稿を作成
              </h2>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* ボディ */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">投稿先</label>
                <select
                  value={selectedTopicId || "free"}
                  onChange={(e) => setSelectedTopicId(e.target.value === "free" ? null : e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="free">自由投稿</option>
                  {topicPosts.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      お題: {topic.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">ファイルから読み込み（任意）</label>
                <input 
                  type="file" 
                  accept=".txt,.pdf,.docx" 
                  onChange={handleFileChange}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">対応形式: テキスト (.txt), PDF, Word (.docx)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">タイトル</label>
                <input
                  type="text"
                  placeholder="投稿のタイトル"
                  value={newPost.title || ""}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">本文</label>
                <textarea
                  placeholder="投稿の内容を入力..."
                  value={newPost.body || ""}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  rows={8}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-3 border-t-4 border-black p-6 bg-gray-50">
              <button
                onClick={() => {
                  setIsPostModalOpen(false);
                  setNewPost({ title: "", body: "", tag: "創作" });
                  setSelectedTopicId(null);
                }}
                className="px-6 py-3 text-black font-black uppercase bg-gray-300 border-3 border-black rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!newPost.title || !newPost.body) {
                    alert("タイトルと本文は必須です");
                    return;
                  }
                  const postData = {
                    title: newPost.title,
                    body: newPost.body,
                    author: penName || session?.user?.name || "匿名部員",
                    authorEmail: session?.user?.email || null,
                    tag: selectedTopicId ? "作品" : "創作",
                    parentPostId: selectedTopicId || null,
                  };
                  fetch("/api/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postData),
                  }).then(async (res) => {
                    if (res.ok) {
                      alert("投稿しました！");
                      setNewPost({ title: "", body: "", tag: "創作" });
                      setSelectedTopicId(null);
                      setIsPostModalOpen(false);
                      await mutatePosts();
                    } else {
                      alert("投稿に失敗しました");
                    }
                  }).catch(() => {
                    alert("投稿に失敗しました");
                  });
                }}
                disabled={!newPost.title || !newPost.body}
                className="px-6 py-3 bg-yellow-400 text-black rounded-lg font-black uppercase border-3 border-white shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                投稿
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
