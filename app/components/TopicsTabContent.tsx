"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { Lightbulb, Pin } from "lucide-react";
import type { Post } from "@/app/types/post";
import { formatDateTime } from "@/app/lib/formatUtils";
import { usePosts } from "@/app/hooks/usePosts";

type TopicsTabContentProps = {
  onOpenTopicDecision: () => void;
  onCreateProposal: () => void;
};

export function TopicsTabContent({
  onOpenTopicDecision,
  onCreateProposal,
}: TopicsTabContentProps) {
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const isChromeTheme = resolvedTheme === "dark";
  const isLibraryTheme = resolvedTheme === "library";
  const {
    topicPosts,
    topicProposals,
    getDisplayIcon,
    getDisplayName,
    getTopicParticipants,
  } = usePosts();

  const nowTimestamp = Date.now();
  const activeTopic = topicPosts.find((topic: Post) => !topic.deadline || topic.deadline >= nowTimestamp) || null;
  const pastTopicsForDisplay = topicPosts.filter((topic: Post) => (activeTopic ? topic.id !== activeTopic.id : true));
  const pastTopicPool = topicPosts.filter((topic: Post) => !!topic.deadline && topic.deadline < nowTimestamp);
  const hasDecisionCandidates = topicProposals.length > 0 || pastTopicPool.length > 0;
  return (
    <>
      <div className="p-3 space-y-3">
        {topicPosts.length === 0 ? (
          <div className="p-10 text-center">
            <Pin size={34} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-sm font-medium">まだお題がありません</p>
            <p className="text-gray-400 text-xs mt-2">右下のボタンからお題案を投稿し、お題を決定できます。</p>
          </div>
        ) : (
          <>
            {/* 今週のお題 */}
            {activeTopic ? (
              <div className="space-y-2">
                <h2 className="text-2xl font-black px-2 uppercase tracking-wide text-black dark:text-green-300">今週のお題</h2>
                <Card 
                  shadow="none"
                  className={isChromeTheme
                    ? "bg-transparent border-0 border-b border-white/35 rounded-none shadow-none"
                    : isLibraryTheme
                      ? "jsr-card bg-[#ECE7DB] rounded-2xl"
                      : "jsr-card bg-gradient-to-br from-pink-300 to-purple-400 dark:from-green-900 dark:to-cyan-900 rounded-2xl"
                  }
                >
                  <CardBody className="p-5 gap-3">
                    <div className="flex items-center">
                      <div className="flex items-center gap-2">
                        {getDisplayIcon(activeTopic.authorEmail) ? (
                          <img
                            src={getDisplayIcon(activeTopic.authorEmail) || ""}
                            alt="投稿者アイコン"
                            className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full object-cover border-2 border-black"
                          />
                        ) : (
                          <div className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full bg-yellow-300 border-2 border-black" />
                        )}
                        <span className="font-black text-base uppercase text-black dark:text-white">{getDisplayName(activeTopic.authorEmail, activeTopic.author)}</span>
                        <Chip size="md" className="bg-black text-white font-black border-2 border-white dark:bg-green-500 dark:text-black dark:border-green-300">
                          <span className="text-lg leading-none">🔥</span> HOT
                        </Chip>
                      </div>
                    </div>
                    <Link 
                      href={`/topic/${activeTopic.id}`}
                      className="block"
                    >
                      <h2 className="text-lg font-bold text-black dark:text-white">{activeTopic.title}</h2>
                      {activeTopic.deadline && (
                        <p className="text-xs font-semibold text-blue-700 dark:text-cyan-300 mt-1">
                          締切: {formatDateTime(activeTopic.deadline)}
                        </p>
                      )}
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{activeTopic.body}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">クリックして詳細ページを表示...</p>
                    </Link>
                    {getTopicParticipants(activeTopic).length > 0 && (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-black dark:text-white">参加者:</span>
                          <div className="flex items-center -space-x-2">
                          {getTopicParticipants(activeTopic)
                            .slice(0, 6)
                            .map((participant) => (
                              participant.icon ? (
                                <img
                                  key={participant.key}
                                  src={participant.icon}
                                  alt={participant.name}
                                  title={participant.name}
                                  className="w-9 h-9 min-w-9 min-h-9 shrink-0 rounded-full object-cover border-3 border-white"
                                />
                              ) : (
                                <div
                                  key={participant.key}
                                  title={participant.name}
                                  className="w-9 h-9 min-w-9 min-h-9 shrink-0 rounded-full bg-yellow-300 text-xs font-black text-black border-3 border-white flex items-center justify-center"
                                >
                                  {participant.name.slice(0, 1)}
                                </div>
                              )
                            ))}
                          {getTopicParticipants(activeTopic).length > 6 && (
                            <div className="w-9 h-9 min-w-9 min-h-9 shrink-0 rounded-full bg-orange-400 text-xs font-black text-white border-3 border-white flex items-center justify-center">
                              +{getTopicParticipants(activeTopic).length - 6}
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-2xl font-black px-2 uppercase tracking-wide text-black dark:text-green-300">今週のお題</h2>
                <Card
                  shadow="none"
                  className={isChromeTheme
                    ? "bg-transparent border-0 border-b border-white/35 rounded-none shadow-none"
                    : "jsr-card bg-white dark:bg-gray-900 rounded-2xl"
                  }
                >
                  <CardBody className="p-5">
                    <p className="text-sm font-black uppercase text-gray-700 dark:text-gray-200">今週のお題はありません</p>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">次のお題が設定されるまでお待ちください。</p>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* お題決定ボタン */}
            {session && (
              <Card shadow="sm" className={isChromeTheme
                ? "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none"
                : "jsr-card border border-blue-300 dark:border-green-600 rounded-2xl bg-blue-50/80 dark:bg-green-950/10"
              }>
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black italic text-base text-black dark:text-green-300 uppercase">新しいお題を決定</p>
                      <p className="text-xs font-bold text-black/70 dark:text-green-200/70">お題案からランダム選択、または手動で選んでお題化できます</p>
                    </div>
                    <button
                      onClick={() => {
                        if (!hasDecisionCandidates) {
                          alert("お題案がありません。まず右下のボタンからお題案を投稿してください。");
                          return;
                        }
                        onOpenTopicDecision();
                      }}
                      className="px-6 py-3 bg-pink-500 text-white rounded-lg font-black uppercase border-3 border-white shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.8)] transition-all text-sm whitespace-nowrap shake-hover"
                    >
                      お題決定
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 過去のお題 */}
            {pastTopicsForDisplay.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-black px-2 mt-6 uppercase tracking-wide text-black dark:text-yellow-300">過去のお題</h3>
                {pastTopicsForDisplay.map((topic) => (
                  <Card 
                    key={topic.id}
                    shadow="none"
                    className={isChromeTheme
                      ? "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none"
                      : "jsr-card bg-white dark:bg-gray-900 rounded-xl"
                    }
                  >
                    <CardBody className="p-4 gap-2">
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          {getDisplayIcon(topic.authorEmail) ? (
                            <img
                              src={getDisplayIcon(topic.authorEmail) || ""}
                              alt="投稿者アイコン"
                              className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full object-cover border-2 border-black dark:border-white"
                            />
                          ) : (
                            <div className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full bg-yellow-300 border-2 border-black dark:border-white" />
                          )}
                          <span className="font-black text-base uppercase text-black dark:text-green-300">{getDisplayName(topic.authorEmail, topic.author)}</span>
                          <Chip size="md" className="bg-gray-300 dark:bg-gray-700 text-black dark:text-yellow-300 font-bold border-2 border-black dark:border-green-600">過去</Chip>
                        </div>
                      </div>
                      <Link 
                        href={`/topic/${topic.id}`}
                        className="block"
                      >
                        <h2 className="text-lg font-bold text-black dark:text-green-200">{topic.title}</h2>
                        {topic.deadline && (
                          <p className="text-xs font-semibold text-blue-700 dark:text-yellow-300 mt-1">
                            締切: {formatDateTime(topic.deadline)}
                          </p>
                        )}
                        <p className="text-sm text-gray-800 dark:text-green-100 line-clamp-2">{topic.body}</p>
                        <p className="text-xs text-gray-600 dark:text-green-200">クリックして詳細ページを表示...</p>
                      </Link>
                      {getTopicParticipants(topic).length > 0 && (
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">参加者:</span>
                            <div className="flex items-center -space-x-2">
                            {getTopicParticipants(topic)
                              .slice(0, 6)
                              .map((participant) => (
                                participant.icon ? (
                                  <img
                                    key={participant.key}
                                    src={participant.icon}
                                    alt={participant.name}
                                    title={participant.name}
                                    className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full object-cover border-2 border-background"
                                  />
                                ) : (
                                  <div
                                    key={participant.key}
                                    title={participant.name}
                                    className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full bg-gray-300 text-[11px] font-bold text-gray-700 border-2 border-background flex items-center justify-center"
                                  >
                                    {participant.name.slice(0, 1)}
                                  </div>
                                )
                              ))}
                            {getTopicParticipants(topic).length > 6 && (
                              <div className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full bg-gray-200 text-[11px] font-bold text-gray-600 border-2 border-background flex items-center justify-center">
                                +{getTopicParticipants(topic).length - 6}
                              </div>
                            )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* お題案登録フロートボタン */}
      {session && (
        <button
          className="fixed right-6 bottom-24 z-40 h-14 rounded-full bg-orange-500 text-white text-base font-black px-6 border-4 border-white shadow-[0_8px_0_rgba(0,0,0,0.9)] hover:shadow-[0_10px_0_rgba(0,0,0,0.9)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_6px_0_rgba(0,0,0,0.9)] transition-all flex items-center gap-2 uppercase shake-hover"
          onClick={onCreateProposal}
          aria-label="お題案を投稿"
        >
          <Lightbulb size={20} strokeWidth={3} />
          お題案
        </button>
      )}
    </>
  );
}
