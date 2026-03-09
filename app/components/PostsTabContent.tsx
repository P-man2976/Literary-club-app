"use client";

import Link from "next/link";
import {
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { Save } from "lucide-react";
import {
  HandDrawnPlusIcon,
  HandDrawnHeartIcon,
  HandDrawnCommentIcon,
  ChromeMessageIcon,
} from "@/app/components/HandDrawnIcons";
import type { Post } from "@/app/types/post";

type PostsTabContentProps = {
  freePosts: Post[];
  topicReplies: Post[];
  topicPosts: Post[];
  isChromeTheme: boolean;
  isLibraryTheme: boolean;
  getDisplayIcon: (email: string | null | undefined) => string | null;
  getDisplayName: (email: string | null | undefined, name: string) => string;
  session: { user?: { email?: string | null; name?: string | null } } | null;
  onCreatePost: () => void;
};

export function PostsTabContent({
  freePosts,
  topicReplies,
  topicPosts,
  isChromeTheme,
  isLibraryTheme,
  getDisplayIcon,
  getDisplayName,
  session,
  onCreatePost,
}: PostsTabContentProps) {
  return (
    <>
      <div className="p-3 space-y-3">
        {(freePosts.length === 0 && topicReplies.length === 0) ? (
          <div className="p-10 text-center">
            <Save size={34} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-sm font-medium">まだ投稿がありません</p>
            <p className="text-gray-400 text-xs mt-2">右下のボタンから投稿を作成できます。</p>
          </div>
        ) : (
          <>
            {[...topicReplies, ...freePosts]
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((post) => {
              const isTopicReply = !!post.parentPostId;
              return (
                <Card 
                  key={post.id}
                  shadow="none"
                  className={isChromeTheme
                    ? "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none"
                    : "jsr-card bg-white dark:bg-gray-800 rounded-xl"
                  }
                >
                  <CardBody className="p-4 gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDisplayIcon(post.authorEmail) ? (
                          <img
                            src={getDisplayIcon(post.authorEmail) || ""}
                            alt="投稿者アイコン"
                            className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full object-cover border-2 border-black dark:border-white"
                          />
                        ) : (
                          <div className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full bg-yellow-300 border-2 border-black dark:border-white" />
                        )}
                        <span className="font-black text-base uppercase text-black dark:text-green-300">{getDisplayName(post.authorEmail, post.author)}</span>
                        {isTopicReply ? (
                          <Chip
                            size="md"
                            className={isLibraryTheme
                              ? "bg-[#E7E0D0] text-[#3F3427] font-bold"
                              : "bg-purple-400 dark:bg-purple-800 text-white font-bold border-2 border-black dark:border-purple-500"
                            }
                          >
                            お題
                          </Chip>
                        ) : (
                          <Chip
                            size="md"
                            className={isLibraryTheme
                              ? "bg-[#E7E0D0] text-[#3F3427] font-bold"
                              : "bg-cyan-400 dark:bg-cyan-700 text-black dark:text-cyan-200 font-bold border-2 border-black dark:border-cyan-400"
                            }
                          >
                            自由投稿
                          </Chip>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                        {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    
                    <Link 
                      href={`/topic/${post.id}`}
                      className="block spray-hover"
                    >
                      <h3 className="text-xl font-black mb-2 uppercase tracking-wide text-black dark:text-green-200">{post.title}</h3>
                      <p className="text-sm font-semibold text-gray-700 dark:text-green-100 line-clamp-3 whitespace-pre-wrap">{post.body}</p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
                        <p className="text-orange-600 dark:text-yellow-300 uppercase">→ クリックして詳細表示</p>
                        <div className="flex items-center gap-4 text-[1.08rem] leading-normal pt-0.5 pb-1 pr-1 overflow-visible">
                          <span className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 leading-normal min-w-max">
                            {isChromeTheme ? <ChromeMessageIcon size={21} /> : <HandDrawnCommentIcon size={21} className="overflow-visible shrink-0" />}
                            {post.commentCount || 0}
                          </span>
                          <span className="flex items-center gap-2 text-red-500 dark:text-pink-400 leading-normal min-w-max">
                            <HandDrawnHeartIcon size={21} className="overflow-visible shrink-0" />
                            {post.likes || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {session && (
        <button
          className={isChromeTheme
            ? "fixed right-6 bottom-24 z-40 h-14 rounded-full bg-gray-600 text-white text-base font-black px-6 border-0 shadow-[0_8px_0_rgba(20,20,20,0.9)] hover:shadow-[0_10px_0_rgba(20,20,20,0.9)] hover:bg-gray-500 hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_6px_0_rgba(20,20,20,0.9)] transition-all flex items-center gap-2 uppercase"
            : "fixed right-6 bottom-24 z-40 h-14 rounded-full bg-yellow-400 text-black text-base font-black px-6 border-4 border-white shadow-[0_8px_0_rgba(0,0,0,0.9)] hover:shadow-[0_10px_0_rgba(0,0,0,0.9)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_6px_0_rgba(0,0,0,0.9)] transition-all flex items-center gap-2 uppercase shake-hover"
          }
          onClick={onCreatePost}
          aria-label="投稿を作成"
        >
          <HandDrawnPlusIcon size={20} />
          投稿
        </button>
      )}
    </>
  );
}
