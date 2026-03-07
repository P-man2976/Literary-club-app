"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getUserIconUrl } from "@/app/lib/imageUtils";
import {
  ArrowLeft,
  FileCheck2,
  Heart,
  MessageCircle,
  PenLine,
  Send,
  TriangleAlert,
} from "lucide-react";

type Comment = {
  commentId: string;
  text: string;
  author: string;
  authorEmail?: string | null;
  createdAt: number;
  editedAt?: number | null;
};

type Post = {
  authorEmail?: string | null;
  id: string;
  author: string;
  title: string;
  subtitle?: string;
  body: string;
  tag: string;
  createdAt: number;
  parentPostId?: string | null;
  isTopicPost?: number;
  deadline?: number | null;
  comments?: Comment[];
  likes?: number;
};

type TopicAnalysis = {
  overview: string;
  strengths: string[];
  suggestions: string[];
  authorFeedback: Array<{
    author: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
  postFeedback: Array<{
    postId: string;
    title: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
};

export default function TopicPage() {
  const aiReadingSettingKey = "lit-club-ai-reading-enabled";
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const topicId = params.topicId as string;

  const [topic, setTopic] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({});
  const [penName, setPenName] = useState("");
  const [penNameMap, setPenNameMap] = useState<{ [email: string]: string }>({});
  const [userIconMap, setUserIconMap] = useState<{ [email: string]: string }>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<TopicAnalysis | null>(null);
  const [scrollingPostId, setScrollingPostId] = useState<string | null>(null);
  const scrollHideTimerRef = useRef<number | null>(null);
  const [showHorizontalHint, setShowHorizontalHint] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostTitle, setEditingPostTitle] = useState("");
  const [editingPostBody, setEditingPostBody] = useState("");
  const [aiReadingEnabled, setAiReadingEnabled] = useState(true);

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

  // トピック詳細と返信を取得
  const fetchTopicAndReplies = async () => {
    try {
      const res = await fetch("/api/posts");
      const allPosts: any[] = await res.json();

      // トピックを取得
      const topicData = allPosts.find(p => p.id === topicId);
      
      // 返信を取得（/api/postsで既にcommentCount, likesが含まれている）
      const repliesData = allPosts.filter(p => p.parentPostId === topicId);
      
      if (topicData) {
        // トピックのコメント詳細のみ取得（件数は既にある）
        const cRes = await fetch(`/api/comments?postId=${topicData.id}`);
        const comments = await cRes.json();
        
        setTopic({ ...topicData, comments });
      }

      // 返信のコメントを一括取得
      const replyIds = repliesData.map(r => r.id);
      let commentsByPostId = new Map<string, any[]>();
      
      if (replyIds.length > 0) {
        const cRes = await fetch(`/api/comments?postIds=${replyIds.join(",")}`);
        const commentsData = await cRes.json();
        commentsByPostId = new Map(Object.entries(commentsData));
      }
      
      const repliesWithDetails = repliesData.map((reply) => ({
        ...reply,
        comments: commentsByPostId.get(reply.id) || [],
      }));

      // すべてのauthorEmailを収集（トピック、返信、コメント）
      const allEmails = new Set<string>();
      if (topicData?.authorEmail) allEmails.add(topicData.authorEmail);
      repliesWithDetails.forEach(reply => {
        if (reply.authorEmail) allEmails.add(reply.authorEmail);
        reply.comments?.forEach((comment: any) => {
          if (comment.authorEmail) allEmails.add(comment.authorEmail);
        });
      });

      // ペンネームを一括取得
      if (allEmails.size > 0) {
        try {
          const penNameRes = await fetch("/api/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: Array.from(allEmails) }),
          });
          if (penNameRes.ok) {
            const { penNameMap: fetchedMap, userIconMap: fetchedIconMap } = await penNameRes.json();
            setPenNameMap(fetchedMap || {});
            setUserIconMap(fetchedIconMap || {});
          }
        } catch (error) {
          console.error("ペンネーム取得エラー:", error);
        }
      }

      setReplies(repliesWithDetails.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setLoading(false);
    } catch (error) {
      console.error("トピック取得エラー:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicAndReplies();
    
    // Storageからいいねを読み込む
    const savedLikes = localStorage.getItem("lit-club-liked-ids");
    if (savedLikes) {
      setLikedPosts(JSON.parse(savedLikes));
    }
  }, [topicId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(aiReadingSettingKey);
      setAiReadingEnabled(saved !== "0");
    } catch {
      setAiReadingEnabled(true);
    }
  }, []);

  // ペンネーム取得
  useEffect(() => {
    const fetchPenName = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setPenName(data.penName || "");
        }
      } catch (error) {
        console.error("ペンネーム取得エラー:", error);
      }
    };

    if (session) {
      fetchPenName();
    }
  }, [session]);

  // ペンネームまたは通常の名前を返すヘルパー関数
  const getDisplayName = (authorEmail: string | null | undefined, authorName: string) => {
    if (authorEmail && penNameMap[authorEmail]) {
      return penNameMap[authorEmail];
    }
    return authorName;
  };

  const getDisplayIcon = (authorEmail: string | null | undefined) => {
    // メールアドレスから画像URLを生成（R2対応 + 後方互換性あり）
    return getUserIconUrl(authorEmail, userIconMap[authorEmail || ""]);
  };

  const getReplyParticipants = () => {
    const seen = new Set<string>();
    const participants: Array<{ key: string; name: string; icon: string | null }> = [];

    replies.forEach((reply) => {
      const key = reply.authorEmail || `name:${reply.author}`;
      if (seen.has(key)) return;

      seen.add(key);
      participants.push({
        key,
        name: getDisplayName(reply.authorEmail, reply.author),
        icon: getDisplayIcon(reply.authorEmail),
      });
    });

    return participants;
  };

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

  const saveReply = async () => {
    if (!newPost.title || !newPost.body) {
      alert("タイトルと本文を入力してください");
      return;
    }

    // 締め切りチェック
    if (topic && isDeadlineExpired(topic.deadline)) {
      alert("このお題の締め切りが過ぎているため、投稿できません");
      return;
    }

    try {
      const postData = {
        title: newPost.title,
        body: newPost.body,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
        tag: newPost.tag || "創作",
        parentPostId: topicId,
        isTopicPost: 0,
      };

      console.log("投稿データ:", postData);

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      const text = await response.text();
      console.log("レスポンス:", response.status, text);

      if (response.ok) {
        alert("投稿しました！");
        setNewPost({ title: "", body: "", tag: "創作" });
        fetchTopicAndReplies();
      } else {
        console.error("エラー:", text);
        alert("投稿に失敗しました");
      }
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
    }
  };

  const handleLike = async (postId: string) => {
    const isLiked = likedPosts.includes(postId);
    const userId = session?.user?.email || "guest";
    const likeDelta = isLiked ? -1 : 1;

    const method = isLiked ? "DELETE" : "POST";

    // 先にUIだけ反映して体感レスポンスを上げる
    setReplies((prev) =>
      prev.map((reply) => {
        if (reply.id !== postId) return reply;
        return { ...reply, likes: Math.max((reply.likes || 0) + likeDelta, 0) };
      })
    );

    try {
      const response = await fetch("/api/likes", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId }),
      });

      if (response.ok) {
        let newLikedPosts;
        if (isLiked) {
          newLikedPosts = likedPosts.filter(id => id !== postId);
        } else {
          newLikedPosts = [...likedPosts, postId];
        }

        setLikedPosts(newLikedPosts);
        localStorage.setItem("lit-club-liked-ids", JSON.stringify(newLikedPosts));
      } else {
        // 失敗時はカウントを戻す
        setReplies((prev) =>
          prev.map((reply) => {
            if (reply.id !== postId) return reply;
            return { ...reply, likes: Math.max((reply.likes || 0) - likeDelta, 0) };
          })
        );
      }
    } catch (error) {
      console.error("いいね操作エラー:", error);
      setReplies((prev) =>
        prev.map((reply) => {
          if (reply.id !== postId) return reply;
          return { ...reply, likes: Math.max((reply.likes || 0) - likeDelta, 0) };
        })
      );
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("本当に削除しますか？")) return;
    
    try {
      const response = await fetch(`/api/posts?postId=${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // お題そのものを削除した場合はメインページに遷移
        if (postId === topicId) {
          await new Promise(resolve => setTimeout(resolve, 300));
          router.push("/");
        } else {
          // 返信を削除した場合はページを更新
          alert("削除しました！");
          fetchTopicAndReplies();
        }
      }
    } catch (error) {
      console.error("削除エラー:", error);
    }
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

  const saveEditedPost = async (postId: string) => {
    if (!editingPostTitle.trim() || !editingPostBody.trim()) {
      alert("タイトルと内容は必須です");
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          title: editingPostTitle,
          body: editingPostBody,
          authorEmail: session?.user?.email,
        }),
      });

      if (response.ok) {
        alert("更新しました！");
        cancelEditingPost();
        fetchTopicAndReplies();
      } else {
        const error = await response.json();
        alert(`更新に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("編集エラー:", error);
      alert("編集に失敗しました");
    }
  };

  const saveComment = async (postId: string) => {
    const text = commentTexts[postId];
    if (!text) return;

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId,
          text: text,
          author: penName || session?.user?.name || "匿名部員",
          authorEmail: session?.user?.email || null,
        }),
      });

      if (response.ok) {
        setCommentTexts({ ...commentTexts, [postId]: "" });
        alert("コメントを送信しました！");
        fetchTopicAndReplies();
      }
    } catch (error) {
      console.error("コメント送信エラー:", error);
    }
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

  const editComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      alert("コメントを入力してください");
      return;
    }

    try {
      const response = await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId: commentId,
          text: editingCommentText,
          authorEmail: session?.user?.email || null,
        }),
      });

      if (response.ok) {
        alert("コメントを編集しました！");
        cancelEditingComment();
        fetchTopicAndReplies();
      } else {
        const error = await response.json();
        alert(error.error || "編集に失敗しました");
      }
    } catch (error) {
      console.error("コメント編集エラー:", error);
      alert("編集に失敗しました");
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;

    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          authorEmail: session?.user?.email || null,
        }),
      });

      if (response.ok) {
        alert("コメントを削除しました");
        fetchTopicAndReplies();
      } else {
        const error = await response.json();
        alert(error.error || "削除に失敗しました");
      }
    } catch (error) {
      console.error("コメント削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  const generateAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/analysis/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAnalysisError(data?.error || "分析の生成に失敗しました");
        return;
      }

      setAnalysisResult(data as TopicAnalysis);
    } catch (error) {
      console.error("analysis error:", error);
      setAnalysisError("分析の生成に失敗しました");
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">読み込み中...</div>;
  }

  if (!topic) {
    return (
      <div className="text-center py-10">
        <p>投稿が見つかりませんでした</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            戻る
          </button>
          <h1 className="text-2xl font-bold text-center flex-1 text-slate-900 dark:text-slate-100">投稿詳細</h1>
        </div>

        {/* トピック表示 */}
        {editingPostId === topic.id ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border-l-4 border-blue-500 dark:border-blue-400">
            <h3 className="text-lg font-bold mb-4">投稿を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">タイトル</label>
                <input
                  type="text"
                  value={editingPostTitle}
                  onChange={(e) => setEditingPostTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-default-300 dark:border-default-600 bg-default-50 dark:bg-default-800 text-default-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">内容</label>
                <textarea
                  value={editingPostBody}
                  onChange={(e) => setEditingPostBody(e.target.value)}
                  className="w-full px-4 py-2 border border-default-300 dark:border-default-600 bg-default-50 dark:bg-default-800 text-default-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
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
                  className="px-4 py-2 bg-default-300 dark:bg-default-700 text-default-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-default-400 dark:hover:bg-default-600"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border-l-4 border-blue-500 dark:border-blue-400">
          {getDeadlineStatus(topic.deadline) && (
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${getDeadlineStatus(topic.deadline)!.bgColor} ${getDeadlineStatus(topic.deadline)!.textColor}`}>
              {getDeadlineStatus(topic.deadline)!.label}
            </div>
          )}
          <div className="mb-2">
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">{topic.title}</h2>
          </div>
          {topic.subtitle && (
            <p className="text-sm text-gray-600 dark:text-slate-200 mb-4 italic">{topic.subtitle}</p>
          )}
          
          {/* 本体表示 - お題の場合は通常表示、通常投稿の場合は縦読み形式 */}
          {topic.isTopicPost === 1 ? (
            <p className="text-gray-700 dark:text-slate-100 mb-4 whitespace-pre-wrap">{topic.body}</p>
          ) : (
            <div 
              className="mb-4 overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/20 relative group"
              onScroll={() => handleBodyScroll(topic.id)}
              onWheel={(event) => {
                if (event.shiftKey && showHorizontalHint) {
                  dismissHorizontalHint();
                }
              }}
              style={{ direction: 'rtl' }}
            >
              {showHorizontalHint && scrollingPostId !== topic.id && (
                <div className="hidden group-hover:flex absolute top-2 left-2 bg-blue-600/95 text-white text-xs px-3 py-1 rounded-md pointer-events-none z-10">
                  Shift + スクロールで横スクロールできます
                </div>
              )}
              <p className="text-default-900 dark:text-slate-100 whitespace-pre-wrap" style={{ writingMode: 'vertical-rl', height: '400px', minWidth: 'fit-content', direction: 'ltr' }}>{topic.body}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-200 mb-4">
            <span className="flex items-center gap-2">
              {getDisplayIcon(topic.authorEmail) ? (
                <img
                  src={getDisplayIcon(topic.authorEmail) || ""}
                  alt="投稿者アイコン"
                  className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-200 border border-gray-300" />
              )}
              {getDisplayName(topic.authorEmail, topic.author)}
            </span>
            <span>{new Date(topic.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          {/* いいね・編集・削除 */}
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleLike(topic.id)}
              className={`px-4 py-2 rounded font-semibold transition ${
                likedPosts.includes(topic.id)
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
              } flex items-center gap-1`}
            >
              <Heart size={14} className={likedPosts.includes(topic.id) ? "" : "dark:fill-default-500 dark:stroke-default-500"} /> {topic.likes || 0}
            </button>
            {session?.user?.email === topic.authorEmail && (
              <>
                <button
                  onClick={() => startEditingPost(topic.id, topic.title, topic.body)}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded font-semibold hover:bg-blue-200 dark:hover:bg-blue-900"
                >
                  編集
                </button>
                <button
                  onClick={() => deletePost(topic.id)}
                  disabled={replies.length > 0}
                  className={`px-4 py-2 rounded font-semibold ${
                    replies.length > 0
                      ? "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-300 cursor-not-allowed"
                      : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900"
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
            <div className="mb-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-xs font-bold text-default-400 dark:text-slate-300 mb-3 flex items-center gap-1">
                <MessageCircle size={14} /> コメント ({topic.comments.length})
              </p>
              <div className="space-y-3">
                {topic.comments.map((comment) => (
                  <div key={comment.commentId} className="bg-slate-50 dark:bg-slate-900/20 p-3 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-default-700 dark:text-slate-200 flex items-center gap-2">
                        {getDisplayIcon(comment.authorEmail) ? (
                          <img
                            src={getDisplayIcon(comment.authorEmail) || ""}
                            alt="コメント投稿者アイコン"
                            className="w-5 h-5 rounded-full object-cover border border-gray-300"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-600" />
                        )}
                        {getDisplayName(comment.authorEmail, comment.author)}
                        {comment.editedAt && (
                          <span className="text-xs text-default-400 dark:text-slate-300">(編集済み)</span>
                        )}
                      </span>
                      <span className="text-xs text-default-400 dark:text-slate-300">{new Date(comment.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    
                    {/* 編集モード */}
                    {editingCommentId === comment.commentId ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => editComment(comment.commentId)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEditingComment}
                            className="px-3 py-1 bg-default-300 dark:bg-default-700 text-default-700 dark:text-slate-200 rounded text-xs hover:bg-default-400 dark:hover:bg-default-600"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-default-600 dark:text-slate-200 mb-2 whitespace-pre-wrap">{comment.text}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleCommentLike(comment.commentId)}
                            className={`text-xs px-2 py-1 rounded transition ${
                              commentLikes[comment.commentId]
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                : "bg-default-200 dark:bg-default-800 text-default-600 dark:text-default-400 hover:bg-default-300 dark:hover:bg-default-700"
                            } flex items-center gap-1`}
                          >
                            <Heart size={12} className={commentLikes[comment.commentId] ? "" : "dark:fill-default-500 dark:stroke-default-500"} /> {commentLikes[comment.commentId] ? 1 : 0}
                          </button>
                          {session?.user?.email === comment.authorEmail && (
                            <>
                              <button
                                onClick={() => startEditingComment(comment.commentId, comment.text)}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => deleteComment(comment.commentId)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
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
          {session && (
            <div className="pt-4 border-t border-default-200 dark:border-default-700">
              <div className="flex gap-2">
                <textarea
                  placeholder="コメントを入力..."
                  value={commentTexts[topic.id] || ""}
                  onChange={(e) => setCommentTexts({ ...commentTexts, [topic.id]: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={() => saveComment(topic.id)}
                  disabled={!commentTexts[topic.id]}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:bg-default-300 dark:disabled:bg-default-700 disabled:cursor-not-allowed transition"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI講評</h3>
            <button
              onClick={generateAnalysis}
              disabled={analysisLoading || replies.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analysisLoading ? "生成中..." : "分析を生成"}
            </button>
          </div>

          {!aiReadingEnabled && (
            <p className="text-sm text-slate-500 dark:text-slate-200 mb-3">あなたの設定はOFFのため、あなたの投稿は講評対象から除外されます。</p>
          )}

          {replies.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-200">投稿が集まると分析できます。</p>
          )}

          {analysisError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{analysisError}</p>
          )}

          {analysisResult && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">総評</p>
                <p className="text-sm text-slate-600 dark:text-slate-100 whitespace-pre-wrap">{analysisResult.overview}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">良かった点</p>
                <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-100 space-y-1">
                  {analysisResult.strengths?.map((item, idx) => (
                    <li key={`strength-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">改善提案</p>
                <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-100 space-y-1">
                  {analysisResult.suggestions?.map((item, idx) => (
                    <li key={`suggestion-${idx}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">投稿者ごとの講評</p>
                <div className="space-y-2">
                  {analysisResult.authorFeedback?.map((item, idx) => (
                    <div key={`author-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.author}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-100 mt-1">ほめる: {item.praise}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-100 mt-1">批評: {item.critique}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-100 mt-1">次の一歩: {item.nextStep}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">投稿ごとの講評</p>
                <div className="space-y-2">
                  {analysisResult.postFeedback?.map((item, idx) => (
                    <div key={`post-${item.postId || idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-100 mt-1">ほめる: {item.praise}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-100 mt-1">批評: {item.critique}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-100 mt-1">次の一歩: {item.nextStep}</p>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 mb-8">
            <h3 className="text-lg font-bold dark:text-slate-100 mb-4 flex items-center gap-2">
              <PenLine size={18} />
              このお題に投稿する
            </h3>
            
            {isDeadlineExpired(topic.deadline) ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-200 mt-2">対応形式: テキスト (.txt), PDF, Word (.docx)</p>
                  <p className="text-xs text-gray-400 dark:text-slate-300 mt-1">ファイルのタイトルと内容から自動で投稿が作成されます</p>
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
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-3 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition flex items-center justify-center gap-2"
                    >
                      <Send size={16} />
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">このお題への投稿 ({replies.length})</h3>
            {getReplyParticipants().length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">参加者</span>
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
                          className="w-7 h-7 rounded-full object-cover border-2 border-white"
                        />
                      ) : (
                        <div
                          key={participant.key}
                          title={participant.name}
                          className="w-7 h-7 rounded-full bg-gray-300 text-[10px] font-bold text-gray-700 border-2 border-white flex items-center justify-center"
                        >
                          {participant.name.slice(0, 1)}
                        </div>
                      )
                    ))}
                  {getReplyParticipants().length > 8 && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 border-2 border-white flex items-center justify-center">
                      +{getReplyParticipants().length - 8}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {replies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">まだ投稿がありません</p>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-md p-6 mb-4 border-l-4 border-blue-500 dark:border-blue-400"
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
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">内容</label>
                        <textarea
                          value={editingPostBody}
                          onChange={(e) => setEditingPostBody(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
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
                          className="px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-slate-600"
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
                  <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">{reply.title}</h4>
                  <div 
                      className="mb-4 overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/20 relative group" 
                      onScroll={() => handleBodyScroll(reply.id)}
                      onWheel={(event) => {
                        if (event.shiftKey && showHorizontalHint) {
                          dismissHorizontalHint();
                        }
                      }}
                    style={{ direction: 'rtl' }}
                  >
                      {showHorizontalHint && scrollingPostId !== reply.id && (
                        <div className="hidden group-hover:flex absolute top-2 left-2 bg-blue-600/95 text-white text-xs px-3 py-1 rounded-md pointer-events-none z-10">
                          Shift + スクロールで横スクロールできます
                        </div>
                      )}
                      <p className="text-default-900 dark:text-slate-100 whitespace-pre-wrap" style={{ writingMode: 'vertical-rl', height: '400px', minWidth: 'fit-content', direction: 'ltr' }}>{reply.body}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-default-500 dark:text-slate-300 mb-4">
                    <span className="flex items-center gap-2">
                      {getDisplayIcon(reply.authorEmail) ? (
                        <img
                          src={getDisplayIcon(reply.authorEmail) || ""}
                          alt="投稿者アイコン"
                          className="w-6 h-6 rounded-full object-cover border border-gray-300"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-600" />
                      )}
                      {getDisplayName(reply.authorEmail, reply.author)}
                    </span>
                    <span>{new Date(reply.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleLike(reply.id)}
                      className={`px-4 py-2 rounded font-semibold transition ${
                        likedPosts.includes(reply.id)
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                      } flex items-center gap-1`}
                    >
                      <Heart size={14} className={likedPosts.includes(reply.id) ? "" : "dark:fill-default-500 dark:stroke-default-500"} /> {reply.likes || 0}
                    </button>
                    {session?.user?.email === reply.authorEmail && (
                      <>
                        <button
                          onClick={() => startEditingPost(reply.id, reply.title, reply.body)}
                          className="px-4 py-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded font-semibold hover:bg-blue-200 dark:hover:bg-blue-900"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => deletePost(reply.id)}
                          className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-semibold hover:bg-red-200 dark:hover:bg-red-900/50"
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
                  <div className="mb-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs font-bold text-default-400 dark:text-slate-300 mb-3 flex items-center gap-1">
                      <MessageCircle size={14} /> コメント ({reply.comments.length})
                    </p>
                    <div className="space-y-3">
                      {reply.comments.map((comment) => (
                        <div key={comment.commentId} className="bg-slate-50 dark:bg-slate-900/20 p-3 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-default-700 dark:text-slate-200 flex items-center gap-2">
                              {getDisplayIcon(comment.authorEmail) ? (
                                <img
                                  src={getDisplayIcon(comment.authorEmail) || ""}
                                  alt="コメント投稿者アイコン"
                                  className="w-5 h-5 rounded-full object-cover border border-gray-300"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-600" />
                              )}
                              {getDisplayName(comment.authorEmail, comment.author)}
                              {comment.editedAt && (
                                <span className="text-xs text-default-400 dark:text-slate-300">(編集済み)</span>
                              )}
                            </span>
                            <span className="text-xs text-default-400 dark:text-slate-300">{new Date(comment.createdAt).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          {/* 編集モード */}
                          {editingCommentId === comment.commentId ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => editComment(comment.commentId)}
                                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={cancelEditingComment}
                                  className="px-3 py-1 bg-default-300 dark:bg-default-700 text-default-700 dark:text-slate-200 rounded text-xs hover:bg-default-400 dark:hover:bg-default-600"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-default-600 dark:text-slate-200 mb-2 whitespace-pre-wrap">{comment.text}</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleCommentLike(comment.commentId)}
                                  className={`text-xs px-2 py-1 rounded transition ${
                                    commentLikes[comment.commentId]
                                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                      : "bg-default-200 dark:bg-default-800 text-default-600 dark:text-default-400 hover:bg-default-300 dark:hover:bg-default-700"
                                  } flex items-center gap-1`}
                                >
                                  <Heart size={12} className={commentLikes[comment.commentId] ? "" : "dark:fill-default-500 dark:stroke-default-500"} /> {commentLikes[comment.commentId] ? 1 : 0}
                                </button>
                                {session?.user?.email === comment.authorEmail && (
                                  <>
                                    <button
                                      onClick={() => startEditingComment(comment.commentId, comment.text)}
                                      className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                                    >
                                      編集
                                    </button>
                                    <button
                                      onClick={() => deleteComment(comment.commentId)}
                                      className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
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
                {session && (
                  <div className="pt-4 border-t border-default-200 dark:border-default-700">
                    <div className="flex gap-2">
                      <textarea
                        placeholder="コメントを入力..."
                        value={commentTexts[reply.id] || ""}
                        onChange={(e) => setCommentTexts({ ...commentTexts, [reply.id]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                      <button
                        onClick={() => saveComment(reply.id)}
                        disabled={!commentTexts[reply.id]}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:bg-default-300 dark:disabled:bg-default-700 disabled:cursor-not-allowed transition"
                      >
                        送信
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        )}
      </div>
    </div>
  );
}
