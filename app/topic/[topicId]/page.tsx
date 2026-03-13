"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAppTheme } from "@/app/hooks/useAppTheme";
import { useTopicDetail } from "@/app/hooks/useTopicDetail";
import { useTopicMutations } from "@/app/hooks/useTopicMutations";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import type { Post } from "@/app/types/post";
import {
  ArrowLeft,
} from "lucide-react";

import { tv } from "tailwind-variants";
import {
  UserIcon,
  ParticipantAvatars,
  PostActionButtons,
  CommentSection,
  CommentInput,
  EditPostForm,
  VerticalTextDisplay,
  AIAnalysisSection,
  PostFormSection,
} from "./components";

const topicScene = tv({
  base: "topic-detail-scene min-h-screen p-4 md:p-6 relative z-10",
  variants: {
    theme: {
      street: "",
      chrome: "chrome-theme-detail",
      library: "",
    },
  },
});

const topicHeader = tv({
  base: "flex items-center mb-8 p-4",
  variants: {
    theme: {
      street: "bg-white/20 backdrop-blur-md shadow-street-hard rounded-2xl",
      chrome: "bg-black border-b border-white/30",
      library: "bg-library-bg rounded-2xl shadow-library-neu-lg",
    },
  },
});

const topicHeaderTitle = tv({
  base: "text-center flex-1 tracking-wide",
  variants: {
    theme: {
      street: "text-3xl font-black uppercase",
      chrome: "text-xl font-black text-white",
      library: "text-2xl font-serif font-bold text-[#3F3427]",
    },
  },
});

const parentTopicBox = tv({
  base: "p-4 mb-6",
  variants: {
    theme: {
      street: "bg-blue-50 border-l-4 border-blue-500 rounded-xl",
      chrome: "border-l-2 font-black border-white/40",
      library: "bg-library-surface border-l-4 border-[#A38D73] rounded-xl shadow-library-neu-lg",
    },
  },
});

const topicCard = tv({
  base: "p-6 mb-8",
  variants: {
    theme: {
      street: "jsr-card bg-white rounded-2xl",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none",
      library: "jsr-card bg-white rounded-2xl",
    },
  },
});

const aiSection = tv({
  base: "p-6 mb-8",
  variants: {
    theme: {
      street: "jsr-card bg-linear-to-br from-purple-300 to-pink-300 rounded-2xl",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none",
      library: "jsr-card bg-library-surface rounded-2xl shadow-library-neu",
    },
  },
});

const postFormSection = tv({
  base: "p-6 mb-8",
  variants: {
    theme: {
      street: "bg-white rounded-2xl shadow-md",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none",
      library: "bg-white rounded-2xl shadow-library-neu",
    },
  },
});

const postFormTitle = tv({
  base: "mb-4 flex items-center gap-2",
  variants: {
    theme: {
      street: "text-lg font-bold",
      chrome: "text-base font-medium text-white",
      library: "text-lg font-serif font-bold text-[#3F3427]",
    },
  },
});

const repliesHeader = tv({
  base: "flex items-center justify-between mb-4 p-4",
  variants: {
    theme: {
      street: "bg-white/20 backdrop-blur-md shadow-street-hard rounded-2xl",
      chrome: "border-b border-white/30",
      library: "bg-library-cream rounded-2xl shadow-library-neu",
    },
  },
});

const replyCard = tv({
  base: "p-6 mb-4",
  variants: {
    theme: {
      street: "jsr-card bg-white rounded-2xl spray-hover",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none",
      library: "jsr-card bg-white rounded-2xl",
    },
  },
});

export default function TopicPage() {
  const aiReadingSettingKey = "lit-club-ai-reading-enabled";
  const { data: session } = useSession();
  const { appTheme } = useAppTheme();
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;

  // --- SWR フックでデータ取得 ---
  const {
    topic,
    parentTopic,
    replies,
    postsLoading,
    penNameMap,
    getDisplayName,
    getDisplayIcon,
    getReplyParticipants,
    getLikeParticipants,
    analysisLoading,
    analysisError,
    analysisResult,
    generateAnalysis,
    mutateAll,
  } = useTopicDetail(topicId);

  const { penName } = useUserProfile(session);

  const getAnonymousUserId = () => {
    const storageKey = "lit-club-anonymous-user-id";
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;

      const generated = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(storageKey, generated);
      return generated;
    } catch {
      return `anon-fallback-${Date.now()}`;
    }
  };

  // --- Mutation フック ---
  const {
    saveReply: triggerSaveReply,
    handleLike,
    deletePost,
    saveEditedPost: triggerSaveEditedPost,
    saveComment: triggerSaveComment,
    editComment: triggerEditComment,
    deleteComment,
  } = useTopicMutations({
    topicId,
    session,
    penName,
    mutateAll,
    router,
    getAnonymousUserId,
  });

  // --- ローカル UI state ---
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [scrollingPostId, setScrollingPostId] = useState<string | null>(null);

  const scrollHideTimerRef = useRef<number | null>(null);
  const [showHorizontalHint, setShowHorizontalHint] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostTitle, setEditingPostTitle] = useState("");
  const [editingPostBody, setEditingPostBody] = useState("");
  const [aiReadingEnabled, setAiReadingEnabled] = useState(true);
  const [iconCacheBust] = useState<number>(Date.now());

  const handleBodyScroll = (postId: string) => {
    setScrollingPostId(postId);
    if (scrollHideTimerRef.current) {
      window.clearTimeout(scrollHideTimerRef.current);
    }
    scrollHideTimerRef.current = window.setTimeout(() => {
      setScrollingPostId((current) => (current === postId ? null : current));
    }, 200);
  };

  const dismissHorizontalHint = () => {
    setShowHorizontalHint(false);
    try {
      localStorage.setItem("lit-club-horizontal-hint-dismissed", "1");
    } catch {
      // Ignore storage errors on restricted browsers.
    }
  };

  useEffect(() => {
    return () => {
      if (scrollHideTimerRef.current) {
        window.clearTimeout(scrollHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // タッチデバイス（スマホ・タブレット）ではヒントを表示しない
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      setShowHorizontalHint(false);
      return;
    }

    // PC環境のみ：localStorageで非表示設定を確認
    try {
      const dismissed = localStorage.getItem("lit-club-horizontal-hint-dismissed") === "1";
      if (!dismissed) {
        setShowHorizontalHint(true);
      }
    } catch {
      // Ignore storage errors on restricted browsers.
      setShowHorizontalHint(true);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(aiReadingSettingKey);
      setAiReadingEnabled(saved !== "0");
    } catch {
      setAiReadingEnabled(true);
    }
  }, []);

  const getDeadlineStatus = (deadline: number | null | undefined) => {
    if (!deadline) return null;

    const deadlineText = new Date(deadline).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const now = Date.now();
    const timeLeft = deadline - now;
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    const daysLeft = timeLeft / (1000 * 60 * 60 * 24);

    if (timeLeft < 0) {
      return { status: "expired", label: `締切済 (${deadlineText})`, bgColor: "bg-gray-100", textColor: "text-gray-600" };
    } else if (hoursLeft < 24) {
      return { status: "urgent", label: `あと24時間 (締切: ${deadlineText})`, bgColor: "bg-red-100", textColor: "text-red-600" };
    } else if (daysLeft < 3) {
      return { status: "soon", label: `まもなく締切 (締切: ${deadlineText})`, bgColor: "bg-orange-100", textColor: "text-orange-600" };
    } else {
      return { status: "active", label: `締切: ${deadlineText}`, bgColor: "bg-blue-100", textColor: "text-blue-600" };
    }
  };

  const isDeadlineExpired = (deadline: number | null | undefined) => {
    if (!deadline) return false;
    return Date.now() > deadline;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    try {
      if (file.type === "text/plain") {
        const text = await file.text();
        setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
      } else if (file.type === "application/pdf") {
        const PDFJS = await import("pdfjs-dist");
        PDFJS.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = PDFJS.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Y座標を使って改行を検出
          let lastY = -1;
          let pageText = "";
          for (const item of textContent.items as any[]) {
            if (!item.str) continue;
            
            const currentY = item.transform[5]; // Y座標
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
              // Y座標が変わったら改行
              pageText += "\n";
            } else if (lastY !== -1 && pageText.length > 0 && !pageText.endsWith(" ")) {
              // 同じ行でスペースがない場合はスペース追加
              pageText += " ";
            }
            pageText += item.str;
            lastY = currentY;
          }
          
          text += pageText + "\n";
        }
        
        setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const JSZip = (await import("jszip")).default;
        
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(arrayBuffer);
        const xml = await loadedZip.file("word/document.xml")?.async("text");
        
        if (xml) {
          const doc = new DOMParser().parseFromString(xml, "text/xml");
          let text = "";

          const paragraphs = doc.getElementsByTagName("w:p");

          const readNodeText = (node: Node): string => {
            const name = node.nodeName;
            if (name === "w:t") return node.textContent || "";
            if (name === "w:tab") return "\t";
            if (name === "w:br" || name === "w:cr") return "\n";

            let out = "";
            node.childNodes.forEach((child) => {
              out += readNodeText(child);
            });
            return out;
          };

          for (let i = 0; i < paragraphs.length; i++) {
            text += readNodeText(paragraphs[i]);
            if (i < paragraphs.length - 1) {
              text += "\n";
            }
          }

          setNewPost((prev) => ({ ...prev, title: fileName, body: text || "DOCX解析に失敗しました" }));
        } else {
          setNewPost((prev) => ({ ...prev, title: fileName, body: "DOCX解析に失敗しました" }));
        }
      }
    } catch (error) {
      console.error("ファイル解析エラー:", error);
      alert("ファイルの解析に失敗しました");
    }
  };

  const saveReply = () => {
    if (topic && isDeadlineExpired(topic.deadline)) {
      alert("このお題の締め切りが過ぎているため、投稿できません");
      return;
    }
    triggerSaveReply(newPost, () => {
      setNewPost({ title: "", body: "", tag: "創作" });
    });
  };

  const startEditingPost = (postId: string, title: string, body: string) => {
    setEditingPostId(postId);
    setEditingPostTitle(title);
    setEditingPostBody(body);
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditingPostTitle("");
    setEditingPostBody("");
  };

  const saveEditedPost = (postId: string) => {
    triggerSaveEditedPost(postId, editingPostTitle, editingPostBody, cancelEditingPost);
  };

  const saveComment = (postId: string) => {
    const text = commentTexts[postId];
    triggerSaveComment(postId, text, () => {
      setCommentTexts({ ...commentTexts, [postId]: "" });
    });
  };

  const toggleCommentLike = (commentId: string) => {
    setCommentLikes({ ...commentLikes, [commentId]: !commentLikes[commentId] });
  };

  const startEditingComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const editComment = (commentId: string) => {
    triggerEditComment(commentId, editingCommentText, cancelEditingComment);
  };

  if (postsLoading) {
    return <div className="text-center py-10">読み込み中...</div>;
  }

  if (!topic) {
    return (
      <div className="text-center py-10">
        <p>投稿が見つかりませんでした</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-sm"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className={topicScene({ theme: appTheme })}>
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className={topicHeader({ theme: appTheme })}>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-cyan-400 text-black border-3 border-black rounded-full font-black uppercase shake-hover flex items-center gap-2 hover:translate-y-[-2px] transition-all"
          >
            <ArrowLeft size={18} strokeWidth={3} />
            戻る
          </button>
          <h1 className={topicHeaderTitle({ theme: appTheme })}>投稿詳細</h1>
        </div>

        {/* 親のお題（お題への返信の場合） */}
        {parentTopic && (
          <div className={parentTopicBox({ theme: appTheme })}>
            <p className="text-sm font-bold text-blue-600 chrome:text-blue-400 mb-2">このお題への返信です</p>
            <h3 className="text-lg font-black text-black chrome:text-blue-200 mb-2 uppercase">{parentTopic.title}</h3>
            <p className="text-sm text-gray-700 chrome:text-gray-300 line-clamp-2">{parentTopic.body}</p>
          </div>
        )}

        {/* トピック表示 */}
        {editingPostId === topic.id ? (
          <EditPostForm
            postId={topic.id}
            title={editingPostTitle}
            body={editingPostBody}
            onTitleChange={setEditingPostTitle}
            onBodyChange={setEditingPostBody}
            onSave={saveEditedPost}
            onCancel={cancelEditingPost}
          />
        ) : (
        <div className={topicCard({ theme: appTheme })}>
          {getDeadlineStatus(topic.deadline) && (
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-black mb-3 border-2 border-black chrome:border-green-500 ${getDeadlineStatus(topic.deadline)!.bgColor} ${getDeadlineStatus(topic.deadline)!.textColor}`}>
              {getDeadlineStatus(topic.deadline)!.label}
            </div>
          )}
          <div className="mb-2">
            <h2 className="text-2xl font-black uppercase tracking-wide text-black chrome:text-green-300">{topic.title}</h2>
          </div>
          {topic.subtitle && (
            <p className="text-sm text-gray-600 chrome:text-slate-200 mb-4 italic">{topic.subtitle}</p>
          )}
          
          {/* 本体表示 - お題の場合は通常表示、通常投稿の場合は縦読み形式 */}
          {topic.isTopicPost === 1 ? (
            <p className="text-gray-700 chrome:text-green-100 mb-4 whitespace-pre-wrap font-semibold">{topic.body}</p>
          ) : (
            <VerticalTextDisplay
              postId={topic.id}
              body={topic.body}
              scrollingPostId={scrollingPostId}
              showHorizontalHint={showHorizontalHint}
              onScroll={handleBodyScroll}
              onDismissHint={dismissHorizontalHint}
            />
          )}
          
          <div className="flex items-center justify-between text-sm font-bold mb-4">
            <span className="flex items-center gap-2">
              <UserIcon
                src={getDisplayIcon(topic.authorEmail)}
                alt="投稿者アイコン"
                size="sm"
                cacheBust={iconCacheBust}
                className="border-black"
              />
              <span className="font-black uppercase">{getDisplayName(topic.authorEmail, topic.author)}</span>
            </span>
            <span className="text-xs">{new Date(topic.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          {/* いいね・編集・削除 */}
          <PostActionButtons
            postId={topic.id}
            likes={topic.likes}
            isLiked={topic.likesUserIds?.includes(session?.user?.email || getAnonymousUserId()) ?? false}
            participants={getLikeParticipants(topic)}
            isAuthor={session?.user?.email === topic.authorEmail}
            onLike={() => {
              const userId = session?.user?.email || getAnonymousUserId();
              handleLike(topic.id, topic.likesUserIds?.includes(userId) ?? false);
            }}
            onEdit={() => startEditingPost(topic.id, topic.title, topic.body)}
            onDelete={() => deletePost(topic.id)}
            deleteDisabled={replies.length > 0}
            deleteDisabledReason={replies.length > 0 ? "この投稿に返信があるため削除できません" : undefined}
          />
          
          {/* コメント一覧 */}
          <CommentSection
            comments={topic.comments}
            appTheme={appTheme}
            editingCommentId={editingCommentId}
            editingCommentText={editingCommentText}
            commentLikes={commentLikes}
            sessionEmail={session?.user?.email}
            iconCacheBust={iconCacheBust}
            getDisplayIcon={getDisplayIcon}
            getDisplayName={getDisplayName}
            onEditTextChange={setEditingCommentText}
            onEditSave={editComment}
            onEditCancel={cancelEditingComment}
            onEditStart={startEditingComment}
            onToggleLike={toggleCommentLike}
            onDelete={deleteComment}
          />

          {/* 通常投稿の詳細画面ではコメントをその場で投稿可能にする */}
          {topic.isTopicPost !== 1 && (
            <CommentInput
              postId={topic.id}
              value={commentTexts[topic.id] || ""}
              onChange={(postId, value) => setCommentTexts({ ...commentTexts, [postId]: value })}
              onSubmit={saveComment}
            />
          )}
          
        </div>
        )}

        {/* AI分析 - お題の場合のみ表示 */}
        {topic.isTopicPost === 1 && (
        <div className={aiSection({ theme: appTheme })}>
          <AIAnalysisSection
            repliesCount={replies.length}
            aiReadingEnabled={aiReadingEnabled}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
            analysisResult={analysisResult}
            onGenerate={generateAnalysis}
          />
        </div>
        )}

        {/* 投稿フォーム（ファイルインポート専用） - お題の場合のみ表示 */}
        {session && topic.isTopicPost === 1 && (
          <PostFormSection
            appTheme={appTheme}
            sectionClassName={postFormSection({ theme: appTheme })}
            titleClassName={postFormTitle({ theme: appTheme })}
            isDeadlineExpired={isDeadlineExpired(topic.deadline)}
            newPost={newPost}
            onFileChange={handleFileChange}
            onTagChange={(tag) => setNewPost({ ...newPost, tag })}
            onSubmit={saveReply}
          />
        )}

        {/* 投稿一覧 - お題の場合のみ表示 */}
        {topic.isTopicPost === 1 && (
        <div>
          <div className={repliesHeader({ theme: appTheme })}>
            <h3 className="text-xl font-black uppercase tracking-wide">このお題への投稿 ({replies.length})</h3>
            {getReplyParticipants().length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase">参加者</span>
                <ParticipantAvatars
                  participants={getReplyParticipants()}
                  maxDisplay={8}
                  size="md"
                />
              </div>
            )}
          </div>
          {replies.length === 0 ? (
            <p className="text-center py-8 font-black uppercase text-xl">まだ投稿がありません</p>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className={replyCard({ theme: appTheme })}
              >
                {/* 編集フォーム */}
                {editingPostId === reply.id ? (
                  <EditPostForm
                    postId={reply.id}
                    title={editingPostTitle}
                    body={editingPostBody}
                    onTitleChange={setEditingPostTitle}
                    onBodyChange={setEditingPostBody}
                    onSave={saveEditedPost}
                    onCancel={cancelEditingPost}
                  />
                ) : (
                  <>
                {/* 投稿本体 */}
                <div className="mb-4">
                  <h4 className="text-xl font-black uppercase tracking-wide text-black chrome:text-green-300 mb-3">{reply.title}</h4>
                  <VerticalTextDisplay
                    postId={reply.id}
                    body={reply.body}
                    scrollingPostId={scrollingPostId}
                    showHorizontalHint={showHorizontalHint}
                    onScroll={handleBodyScroll}
                    onDismissHint={dismissHorizontalHint}
                    className="mb-4 overflow-x-auto border-3 border-black chrome:border-green-700 rounded-xl p-4 bg-cyan-50 chrome:bg-gray-950 relative group"
                    textClassName="text-black chrome:text-green-200 whitespace-pre-wrap font-semibold"
                    hintClassName="hidden group-hover:flex absolute top-2 left-2 bg-cyan-600 chrome:bg-green-600 text-white chrome:text-black text-xs px-3 py-2 rounded-lg font-black uppercase pointer-events-none z-10 border-2 border-black chrome:border-green-500"
                  />
                  <div className="flex items-center justify-between text-sm font-bold mb-4">
                    <span className="flex items-center gap-2">
                      <UserIcon
                        src={getDisplayIcon(reply.authorEmail)}
                        alt="投稿者アイコン"
                        size="sm"
                        cacheBust={iconCacheBust}
                      />
                      <span className="uppercase font-black text-black chrome:text-green-300">{getDisplayName(reply.authorEmail, reply.author)}</span>
                    </span>
                    <span className="text-xs">{new Date(reply.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <PostActionButtons
                    postId={reply.id}
                    likes={reply.likes}
                    isLiked={reply.likesUserIds?.includes(session?.user?.email || getAnonymousUserId()) ?? false}
                    participants={getLikeParticipants(reply)}
                    isAuthor={session?.user?.email === reply.authorEmail}
                    onLike={() => {
                      const userId = session?.user?.email || getAnonymousUserId();
                      handleLike(reply.id, reply.likesUserIds?.includes(userId) ?? false);
                    }}
                    onEdit={() => startEditingPost(reply.id, reply.title, reply.body)}
                    onDelete={() => deletePost(reply.id)}
                  />
                </div>
                </>
                )}

                {/* コメント一覧 */}
                <CommentSection
                  comments={reply.comments}
                  appTheme={appTheme}
                  editingCommentId={editingCommentId}
                  editingCommentText={editingCommentText}
                  commentLikes={commentLikes}
                  sessionEmail={session?.user?.email}
                  iconCacheBust={iconCacheBust}
                  getDisplayIcon={getDisplayIcon}
                  getDisplayName={getDisplayName}
                  onEditTextChange={setEditingCommentText}
                  onEditSave={editComment}
                  onEditCancel={cancelEditingComment}
                  onEditStart={startEditingComment}
                  onToggleLike={toggleCommentLike}
                  onDelete={deleteComment}
                />

                {/* コメント入力フォーム */}
                <CommentInput
                  postId={reply.id}
                  value={commentTexts[reply.id] || ""}
                  onChange={(postId, value) => setCommentTexts({ ...commentTexts, [postId]: value })}
                  onSubmit={saveComment}
                />
              </div>
            ))
          )}
        </div>
        )}
      </div>
    </div>
  );
}
