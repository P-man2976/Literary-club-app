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
  FileCheck2,
  Heart,
  MessageCircle,
  PenLine,
  Send,
  TriangleAlert,
} from "lucide-react";
import {
  HandDrawnHeartIcon,
  HandDrawnCommentIcon,
} from "@/app/components/HandDrawnIcons";
import { tv } from "tailwind-variants";

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

const commentBubble = tv({
  base: "bg-yellow-100 border-3 border-black rounded-xl p-3 text-sm",
  variants: {
    theme: {
      street: "shadow-street-hard-md",
      chrome: "shadow-street-hard-md",
      library: "",
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
    mutateLikes,
    likesData,
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
    isPostLiked,
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
    mutateLikes,
    likesData,
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
          <div className="bg-white chrome:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border-l-4 border-blue-500 chrome:border-blue-400">
            <h3 className="text-lg font-bold mb-4">投稿を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">タイトル</label>
                <input
                  type="text"
                  value={editingPostTitle}
                  onChange={(e) => setEditingPostTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-default-300 chrome:border-default-600 bg-default-50 chrome:bg-default-800 text-default-900 chrome:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">内容</label>
                <textarea
                  value={editingPostBody}
                  onChange={(e) => setEditingPostBody(e.target.value)}
                  className="w-full px-4 py-2 border border-default-300 chrome:border-default-600 bg-default-50 chrome:bg-default-800 text-default-900 chrome:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => saveEditedPost(topic.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={cancelEditingPost}
                  className="px-4 py-2 bg-default-300 chrome:bg-default-700 text-default-700 chrome:text-slate-200 rounded-lg font-semibold hover:bg-default-400 chrome:hover:bg-default-600"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
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
            <div 
              className="mb-4 overflow-x-auto border border-gray-200 chrome:border-green-700 rounded-lg p-4 bg-slate-50 chrome:bg-gray-950 relative group"
              onScroll={() => handleBodyScroll(topic.id)}
              onWheel={(event) => {
                if (event.shiftKey && showHorizontalHint) {
                  dismissHorizontalHint();
                }
              }}
              style={{ direction: 'rtl' }}
            >
              {showHorizontalHint && scrollingPostId !== topic.id && (
                <div className="hidden group-hover:flex absolute top-2 left-2 bg-blue-600 chrome:bg-green-600 text-white chrome:text-black text-xs px-3 py-1 rounded-md pointer-events-none z-10 font-black uppercase">
                  Shift + スクロールで横スクロールできます
                </div>
              )}
              <p className="text-default-900 chrome:text-green-200 whitespace-pre-wrap font-semibold" style={{ writingMode: 'vertical-rl', height: '400px', minWidth: 'fit-content', direction: 'ltr' }}>{topic.body}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm font-bold mb-4">
            <span className="flex items-center gap-2">
              {getDisplayIcon(topic.authorEmail) ? (
                <img
                  src={`${getDisplayIcon(topic.authorEmail)}?_=${iconCacheBust}`}
                  alt="投稿者アイコン"
                  className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full object-cover border-2 border-black"
                />
              ) : (
                <div className="w-8 h-8 min-w-8 min-h-8 shrink-0 rounded-full bg-gray-300 border-2 border-black" />
              )}
              <span className="font-black uppercase">{getDisplayName(topic.authorEmail, topic.author)}</span>
            </span>
            <span className="text-xs">{new Date(topic.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          {/* いいね・編集・削除 */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => handleLike(topic.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition border-3 shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover ${
                isPostLiked(topic.id)
                  ? "bg-pink-400 text-white border-white"
                  : "bg-gray-200 text-black border-black"
              } flex items-center gap-2`}
            >
              <HandDrawnHeartIcon size={13} filled={isPostLiked(topic.id)} /> {topic.likes || 0}
            </button>
            {getLikeParticipants(topic).length > 0 && (
              <div className="flex items-center -space-x-2" title="いいねしたユーザー">
                {getLikeParticipants(topic).slice(0, 6).map((participant) => (
                  participant.icon ? (
                    <img
                      key={participant.key}
                      src={participant.icon}
                      alt={participant.name}
                      title={participant.name}
                      className="w-7 h-7 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div
                      key={participant.key}
                      title={participant.name}
                      className="w-7 h-7 rounded-full bg-gray-500 text-[10px] font-black text-white border-2 border-white flex items-center justify-center"
                    >
                      G
                    </div>
                  )
                ))}
                {getLikeParticipants(topic).length > 6 && (
                  <div className="w-7 h-7 rounded-full bg-black/70 text-[10px] font-black text-white border-2 border-white flex items-center justify-center">
                    +{getLikeParticipants(topic).length - 6}
                  </div>
                )}
              </div>
            )}
            {session?.user?.email === topic.authorEmail && (
              <>
                <button
                  onClick={() => startEditingPost(topic.id, topic.title, topic.body)}
                  className="px-3 py-1.5 text-xs bg-cyan-400 text-black rounded-lg font-black uppercase border-3 border-black shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover transition-all"
                >
                  編集
                </button>
                <button
                  onClick={() => deletePost(topic.id)}
                  disabled={replies.length > 0}
                  className={`px-3 py-1.5 text-xs rounded-lg font-black uppercase border-3 shadow-street-hard transition-all ${
                    replies.length > 0
                      ? "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-50"
                      : "bg-red-400 text-white border-white hover:translate-y-[-2px] hover:shadow-street-hard-hover"
                  }`}
                  title={replies.length > 0 ? "この投稿に返信があるため削除できません" : "削除"}
                >
                  削除
                </button>
              </>
            )}
          </div>
          
          {/* コメント一覧 */}
          {topic.comments && topic.comments.length > 0 && (
            <div className="mb-4 pt-4 border-t-4 border-black">
              <p className="text-sm font-black uppercase mb-3 flex items-center gap-2 tracking-wide">
                <HandDrawnCommentIcon size={18} /> コメント ({topic.comments.length})
              </p>
              <div className="space-y-3">
                {topic.comments.sort((a, b) => a.createdAt - b.createdAt).map((comment) => (
                  <div key={comment.commentId} className={commentBubble({ theme: appTheme })}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black flex items-center gap-2 uppercase text-xs text-black chrome:text-green-300">
                        {getDisplayIcon(comment.authorEmail) ? (
                          <img
                            src={`${getDisplayIcon(comment.authorEmail)}?_=${iconCacheBust}`}
                            alt="コメント投稿者アイコン"
                            className="w-6 h-6 rounded-full object-cover border-2 border-black chrome:border-green-400"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-black chrome:border-green-400" />
                        )}
                        {getDisplayName(comment.authorEmail, comment.author)}
                        {comment.editedAt && (
                          <span className="text-xs">(編集済み)</span>
                        )}
                      </span>
                      <span className="text-xs font-bold">{new Date(comment.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    {/* 編集モード */}
                    {editingCommentId === comment.commentId ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 chrome:border-slate-700 bg-slate-50 chrome:bg-slate-800 text-gray-900 chrome:text-slate-100 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => editComment(comment.commentId)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-sm text-xs hover:bg-blue-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEditingComment}
                            className="px-3 py-1 bg-default-300 chrome:bg-default-700 text-default-700 chrome:text-slate-200 rounded-sm text-xs hover:bg-default-400 chrome:hover:bg-default-600"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-black chrome:text-green-100 mb-2 whitespace-pre-wrap font-semibold">{comment.text}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleCommentLike(comment.commentId)}
                            className={`text-xs px-3 py-1 rounded-lg font-black uppercase transition border-2 shadow-street-hard-sm hover:-translate-y-px hover:shadow-street-hard-sm-hover ${
                              commentLikes[comment.commentId]
                                ? "bg-pink-400 text-white border-white"
                                : "bg-white text-black border-black"
                            } flex items-center gap-1`}
                          >
                            <HandDrawnHeartIcon size={12} filled={commentLikes[comment.commentId]} /> {commentLikes[comment.commentId] ? 1 : 0}
                          </button>
                          {session?.user?.email === comment.authorEmail && (
                            <>
                              <button
                                onClick={() => startEditingComment(comment.commentId, comment.text)}
                                className="text-xs px-3 py-1 bg-cyan-400 text-black rounded-lg font-black uppercase border-2 border-black hover:-translate-y-px transition-all shadow-street-hard-sm"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => deleteComment(comment.commentId)}
                                className="text-xs px-3 py-1 bg-red-400 text-white rounded-lg font-black uppercase border-2 border-white hover:-translate-y-px transition-all shadow-street-hard-sm"
                              >
                                削除
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 通常投稿の詳細画面ではコメントをその場で投稿可能にする */}
          {topic.isTopicPost !== 1 && (
            <div className="pt-4 border-t-4 border-black chrome:border-green-600">
              <div className="flex gap-2">
                <textarea
                  placeholder="コメントを入力..."
                  value={commentTexts[topic.id] || ""}
                  onChange={(e) => setCommentTexts({ ...commentTexts, [topic.id]: e.target.value })}
                  className="flex-1 px-3 py-2 border-3 border-black chrome:border-green-600 bg-white chrome:bg-gray-900 chrome:text-green-200 rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-cyan-400 chrome:focus:ring-green-500"
                  rows={2}
                />
                <button
                  onClick={() => saveComment(topic.id)}
                  disabled={!commentTexts[topic.id]}
                  className="px-4 py-2 bg-cyan-400 text-black rounded-lg font-black uppercase text-sm border-3 border-black shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                >
                  送信
                </button>
              </div>
            </div>
          )}
          
        </div>
        )}

        {/* AI分析 - お題の場合のみ表示 */}
        {topic.isTopicPost === 1 && (
        <div className={aiSection({ theme: appTheme })}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-2xl font-black uppercase tracking-wide text-black chrome:text-purple-300">AI講評</h3>
            <button
              onClick={generateAnalysis}
              disabled={analysisLoading || replies.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analysisLoading ? "生成中..." : "分析を生成"}
            </button>
          </div>

          {!aiReadingEnabled && (
            <p className="text-sm text-slate-500 chrome:text-slate-200 mb-3">あなたの設定はOFFのため、あなたの投稿は講評対象から除外されます。</p>
          )}

          {replies.length === 0 && (
            <p className="text-sm text-slate-500 chrome:text-slate-200">投稿が集まると分析できます。</p>
          )}

          {analysisError && (
            <p className="text-sm text-red-600 chrome:text-red-400 mb-3">{analysisError}</p>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-1">総評</p>
                <p className="text-sm text-slate-600 chrome:text-slate-100 whitespace-pre-wrap">{analysisResult.overview}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-1">良かった点</p>
                <ul className="list-disc pl-5 text-sm text-slate-600 chrome:text-slate-100 space-y-1">
                  {analysisResult.strengths?.map((item, idx) => (
                    <li key={`strength-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-1">改善提案</p>
                <ul className="list-disc pl-5 text-sm text-slate-600 chrome:text-slate-100 space-y-1">
                  {analysisResult.suggestions?.map((item, idx) => (
                    <li key={`suggestion-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-2">投稿者ごとの講評</p>
                <div className="space-y-2">
                  {analysisResult.authorFeedback?.map((item, idx) => (
                    <div key={`author-${idx}`} className="rounded-lg border border-slate-200 chrome:border-slate-700 p-3">
                      <p className="text-sm font-bold text-slate-800 chrome:text-slate-100">{item.author}</p>
                      <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">ほめる: {item.praise}</p>
                      <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">批評: {item.critique}</p>
                      <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">次の一歩: {item.nextStep}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 chrome:text-slate-100 mb-2">投稿ごとの講評</p>
                <div className="space-y-2">
                  {analysisResult.postFeedback?.map((item, idx) => (
                    <div key={`post-${item.postId || idx}`} className="rounded-lg border border-slate-200 chrome:border-slate-700 p-3">
                      <p className="text-sm font-bold text-slate-800 chrome:text-slate-100">{item.title}</p>
                      <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">ほめる: {item.praise}</p>
                      <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">批評: {item.critique}</p>
                      <p className="text-sm text-slate-600 chrome:text-slate-100 mt-1">次の一歩: {item.nextStep}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* 投稿フォーム（ファイルインポート専用） - お題の場合のみ表示 */}
        {session && topic.isTopicPost === 1 && (
          <div className={postFormSection({ theme: appTheme })}>
            <h3 className={postFormTitle({ theme: appTheme })}>
              <PenLine size={18} />
              このお題に投稿する
            </h3>
            
            {isDeadlineExpired(topic.deadline) ? (
              <div className="bg-red-50 chrome:bg-red-950/20 border border-red-200 chrome:border-red-800 rounded-lg p-4">
                <p className="text-red-600 chrome:text-red-400 font-semibold flex items-center gap-2">
                  <TriangleAlert size={16} />
                  このお題の締め切りが過ぎているため、投稿できません
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileChange}
                    className="w-full px-4 py-2 border border-gray-300 chrome:border-slate-700 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100 rounded-sm cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 chrome:text-slate-200 mt-2">対応形式: テキスト (.txt), PDF, Word (.docx)</p>
                  <p className="text-xs text-gray-400 chrome:text-slate-300 mt-1">ファイルのタイトルと内容から自動で投稿が作成されます</p>
                </div>

                {newPost.title && (
                  <>
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-500 font-bold mb-2 flex items-center gap-1">
                        <FileCheck2 size={14} />
                        ファイル解析済み
                      </p>
                      <p className="text-sm font-bold text-blue-900 truncate">{newPost.title}</p>
                      <p className="text-xs text-blue-700 mt-2 line-clamp-3">{newPost.body}</p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">タグ</label>
                      <select
                        value={newPost.tag || "創作"}
                        onChange={(e) => setNewPost({ ...newPost, tag: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option>創作</option>
                        <option>随筆</option>
                        <option>詩</option>
                        <option>感想</option>
                        <option>その他</option>
                      </select>
                    </div>

                    <button
                      onClick={saveReply}
                      className="w-full px-4 py-3 bg-yellow-400 text-black font-black uppercase rounded-lg border-3 border-black shadow-street-hard-hover hover:translate-y-[-2px] hover:shadow-street-hard-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Send size={18} strokeWidth={3} />
                      投稿
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* 投稿一覧 - お題の場合のみ表示 */}
        {topic.isTopicPost === 1 && (
        <div>
          <div className={repliesHeader({ theme: appTheme })}>
            <h3 className="text-xl font-black uppercase tracking-wide">このお題への投稿 ({replies.length})</h3>
            {getReplyParticipants().length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase">参加者</span>
                <div className="flex items-center -space-x-2">
                  {getReplyParticipants()
                    .slice(0, 8)
                    .map((participant) => (
                      participant.icon ? (
                        <img
                          key={participant.key}
                          src={participant.icon}
                          alt={participant.name}
                          title={participant.name}
                          className="w-8 h-8 rounded-full object-cover border-3 border-white shadow-street-hard-active"
                        />
                      ) : (
                        <div
                          key={participant.key}
                          title={participant.name}
                          className="w-8 h-8 rounded-full bg-gray-300 text-xs font-black text-black border-3 border-white shadow-street-hard-active flex items-center justify-center"
                        >
                          {participant.name.slice(0, 1)}
                        </div>
                      )
                    ))}
                  {getReplyParticipants().length > 8 && (
                    <div className="w-8 h-8 rounded-full bg-pink-400 text-xs font-black text-white border-3 border-white shadow-street-hard-active flex items-center justify-center">
                      +{getReplyParticipants().length - 8}
                    </div>
                  )}
                </div>
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
                  <div className="mb-4">
                    <h4 className="text-lg font-bold mb-4">投稿を編集</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">タイトル</label>
                        <input
                          type="text"
                          value={editingPostTitle}
                          onChange={(e) => setEditingPostTitle(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 chrome:border-slate-700 bg-slate-50 chrome:bg-slate-800 text-gray-900 chrome:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">内容</label>
                        <textarea
                          value={editingPostBody}
                          onChange={(e) => setEditingPostBody(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 chrome:border-slate-700 bg-slate-50 chrome:bg-slate-800 text-gray-900 chrome:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                        />
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => saveEditedPost(reply.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEditingPost}
                          className="px-4 py-2 bg-gray-300 chrome:bg-slate-700 text-gray-700 chrome:text-slate-200 rounded-lg font-semibold hover:bg-gray-400 chrome:hover:bg-slate-600"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                {/* 投稿本体 */}
                <div className="mb-4">
                  <h4 className="text-xl font-black uppercase tracking-wide text-black chrome:text-green-300 mb-3">{reply.title}</h4>
                  <div 
                      className="mb-4 overflow-x-auto border-3 border-black chrome:border-green-700 rounded-xl p-4 bg-cyan-50 chrome:bg-gray-950 relative group" 
                      onScroll={() => handleBodyScroll(reply.id)}
                      onWheel={(event) => {
                        if (event.shiftKey && showHorizontalHint) {
                          dismissHorizontalHint();
                        }
                      }}
                    style={{ direction: 'rtl' }}
                  >
                      {showHorizontalHint && scrollingPostId !== reply.id && (
                        <div className="hidden group-hover:flex absolute top-2 left-2 bg-cyan-600 chrome:bg-green-600 text-white chrome:text-black text-xs px-3 py-2 rounded-lg font-black uppercase pointer-events-none z-10 border-2 border-black chrome:border-green-500">
                          Shift + スクロールで横スクロールできます
                        </div>
                      )}
                      <p className="text-black chrome:text-green-200 whitespace-pre-wrap font-semibold" style={{ writingMode: 'vertical-rl', height: '400px', minWidth: 'fit-content', direction: 'ltr' }}>{reply.body}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold mb-4">
                    <span className="flex items-center gap-2">
                      {getDisplayIcon(reply.authorEmail) ? (
                        <img
                          src={`${getDisplayIcon(reply.authorEmail)}?_=${iconCacheBust}`}
                          alt="投稿者アイコン"
                          className="w-7 h-7 rounded-full object-cover border-2 border-black chrome:border-green-400"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-300 border-2 border-black chrome:border-green-400" />
                      )}
                      <span className="uppercase font-black text-black chrome:text-green-300">{getDisplayName(reply.authorEmail, reply.author)}</span>
                    </span>
                    <span className="text-xs">{new Date(reply.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleLike(reply.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-black uppercase transition border-3 shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover ${
                        isPostLiked(reply.id)
                          ? "bg-pink-400 text-white border-white"
                          : "bg-gray-200 text-black border-black"
                      } flex items-center gap-2`}
                    >
                      <HandDrawnHeartIcon size={13} filled={isPostLiked(reply.id)} /> {reply.likes || 0}
                    </button>
                    {getLikeParticipants(reply).length > 0 && (
                      <div className="flex items-center -space-x-2" title="いいねしたユーザー">
                        {getLikeParticipants(reply).slice(0, 6).map((participant) => (
                          participant.icon ? (
                            <img
                              key={participant.key}
                              src={participant.icon}
                              alt={participant.name}
                              title={participant.name}
                              className="w-7 h-7 rounded-full object-cover border-2 border-white"
                            />
                          ) : (
                            <div
                              key={participant.key}
                              title={participant.name}
                              className="w-7 h-7 rounded-full bg-gray-500 text-[10px] font-black text-white border-2 border-white flex items-center justify-center"
                            >
                              G
                            </div>
                          )
                        ))}
                        {getLikeParticipants(reply).length > 6 && (
                          <div className="w-7 h-7 rounded-full bg-black/70 text-[10px] font-black text-white border-2 border-white flex items-center justify-center">
                            +{getLikeParticipants(reply).length - 6}
                          </div>
                        )}
                      </div>
                    )}
                    {session?.user?.email === reply.authorEmail && (
                      <>
                        <button
                          onClick={() => startEditingPost(reply.id, reply.title, reply.body)}
                          className="px-3 py-1.5 text-xs bg-cyan-400 text-black rounded-lg font-black uppercase border-3 border-black shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover transition-all"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => deletePost(reply.id)}
                          className="px-3 py-1.5 text-xs bg-red-400 text-white rounded-lg font-black uppercase border-3 border-white shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover transition-all"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>
                </>
                )}

                {/* コメント一覧 */}
                {reply.comments && reply.comments.length > 0 && (
                  <div className="mb-4 pt-4 border-t-4 border-black">
                    <p className="text-sm font-black uppercase mb-3 flex items-center gap-2 tracking-wide">
                      <HandDrawnCommentIcon size={18} /> コメント ({reply.comments.length})
                    </p>
                    <div className="space-y-3">
                      {reply.comments.sort((a, b) => a.createdAt - b.createdAt).map((comment) => (
                        <div key={comment.commentId} className={commentBubble({ theme: appTheme })}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black flex items-center gap-2 uppercase text-xs text-black chrome:text-green-300">
                              {getDisplayIcon(comment.authorEmail) ? (
                                <img
                                  src={`${getDisplayIcon(comment.authorEmail)}?_=${iconCacheBust}`}
                                  alt="コメント投稿者アイコン"
                                  className="w-6 h-6 rounded-full object-cover border-2 border-black chrome:border-green-400"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-black chrome:border-green-400" />
                              )}
                              {getDisplayName(comment.authorEmail, comment.author)}
                              {comment.editedAt && (
                                <span className="text-xs">(編集済み)</span>
                              )}
                            </span>
                            <span className="text-xs font-bold">{new Date(comment.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          {/* 編集モード */}
                          {editingCommentId === comment.commentId ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 chrome:border-slate-700 bg-slate-50 chrome:bg-slate-800 text-gray-900 chrome:text-slate-100 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => editComment(comment.commentId)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded-sm text-xs hover:bg-blue-600"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={cancelEditingComment}
                                  className="px-3 py-1 bg-default-300 chrome:bg-default-700 text-default-700 chrome:text-slate-200 rounded-sm text-xs hover:bg-default-400 chrome:hover:bg-default-600"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-black chrome:text-green-100 mb-2 whitespace-pre-wrap font-semibold">{comment.text}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleCommentLike(comment.commentId)}
                                  className={`text-xs px-3 py-1 rounded-lg font-black uppercase transition border-2 shadow-street-hard-sm hover:-translate-y-px hover:shadow-street-hard-sm-hover ${
                                    commentLikes[comment.commentId]
                                      ? "bg-pink-400 text-white border-white"
                                      : "bg-white text-black border-black"
                                  } flex items-center gap-1`}
                                >
                                  <HandDrawnHeartIcon size={12} filled={commentLikes[comment.commentId]} /> {commentLikes[comment.commentId] ? 1 : 0}
                                </button>
                                {session?.user?.email === comment.authorEmail && (
                                  <>
                                    <button
                                      onClick={() => startEditingComment(comment.commentId, comment.text)}
                                      className="text-xs px-3 py-1 bg-cyan-400 text-black rounded-lg font-black uppercase border-2 border-black hover:-translate-y-px transition-all shadow-street-hard-sm"
                                    >
                                      編集
                                    </button>
                                    <button
                                      onClick={() => deleteComment(comment.commentId)}
                                      className="text-xs px-3 py-1 bg-red-400 text-white rounded-lg font-black uppercase border-2 border-white hover:-translate-y-px transition-all shadow-street-hard-sm"
                                    >
                                      削除
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* コメント入力フォーム */}
                <div className="pt-4 border-t-4 border-black chrome:border-green-600">
                  <div className="flex gap-2">
                    <textarea
                      placeholder="コメントを入力..."
                      value={commentTexts[reply.id] || ""}
                      onChange={(e) => setCommentTexts({ ...commentTexts, [reply.id]: e.target.value })}
                      className="flex-1 px-3 py-2 border-3 border-black chrome:border-green-600 bg-white chrome:bg-gray-900 chrome:text-green-200 rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-cyan-400 chrome:focus:ring-green-500"
                      rows={2}
                    />
                    <button
                      onClick={() => saveComment(reply.id)}
                      disabled={!commentTexts[reply.id]}
                      className="px-4 py-2 bg-cyan-400 text-black rounded-lg font-black uppercase text-sm border-3 border-black shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    >
                      送信
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        )}
      </div>
    </div>
  );
}
