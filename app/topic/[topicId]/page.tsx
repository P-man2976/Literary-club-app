"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAppTheme } from "@/app/hooks/useAppTheme";
import { useIconUrlMap } from "@/app/hooks/useIconUrl";
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
  likesUserIds?: string[];
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
      library: "bg-library-cream rounded-2xl shadow-library-neu",
    },
  },
});

const topicHeaderTitle = tv({
  base: "text-center flex-1 tracking-wide",
  variants: {
    theme: {
      street: "text-3xl font-black uppercase",
      chrome: "text-xl font-medium text-white",
      library: "text-2xl font-serif font-bold text-[#3F3427]",
    },
  },
});

const parentTopicBox = tv({
  base: "p-4 mb-6",
  variants: {
    theme: {
      street: "bg-blue-50 border-l-4 border-blue-500 rounded-xl",
      chrome: "border-l-2 border-white/40",
      library: "bg-library-surface border-l-4 border-[#A38D73] rounded-xl shadow-library-neu-inset-subtle",
    },
  },
});

const topicCard = tv({
  base: "p-6 mb-8",
  variants: {
    theme: {
      street: "jsr-card bg-white rounded-2xl",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none",
      library: "jsr-card bg-library-surface rounded-2xl",
    },
  },
});

const aiSection = tv({
  base: "p-6 mb-8",
  variants: {
    theme: {
      street: "jsr-card bg-linear-to-br from-purple-300 to-pink-300 rounded-2xl",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none",
      library: "jsr-card bg-library-cream rounded-2xl shadow-library-neu",
    },
  },
});

const postFormSection = tv({
  base: "p-6 mb-8",
  variants: {
    theme: {
      street: "bg-white rounded-2xl shadow-md",
      chrome: "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none",
      library: "bg-library-cream rounded-2xl shadow-library-neu",
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
      library: "jsr-card bg-library-surface rounded-2xl",
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

  const [topic, setTopic] = useState<Post | null>(null);
  const [parentTopic, setParentTopic] = useState<Post | null>(null);
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

  const getDisplayIcon = useIconUrlMap(userIconMap);
  const scrollHideTimerRef = useRef<number | null>(null);
  const [showHorizontalHint, setShowHorizontalHint] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostTitle, setEditingPostTitle] = useState("");
  const [editingPostBody, setEditingPostBody] = useState("");
  const [aiReadingEnabled, setAiReadingEnabled] = useState(true);
  const [iconCacheBust] = useState<number>(Date.now());

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
        
        // 親のお題がある場合は取得
        if (topicData.parentPostId) {
          const parentPost = allPosts.find(p => p.id === topicData.parentPostId);
          if (parentPost) {
            setParentTopic(parentPost);
          }
        }
      }

      // 返信のコメントを一括取得
      const replyIds = repliesData.map(r => r.id);
      let commentsByPostId = new Map<string, any[]>();
      let likesByPostId = new Map<string, string[]>();
      
      if (replyIds.length > 0) {
        const cRes = await fetch(`/api/comments?postIds=${replyIds.join(",")}`);
        const commentsData = await cRes.json();
        commentsByPostId = new Map(Object.entries(commentsData));

        const lRes = await fetch(`/api/likes?postIds=${[topicId, ...replyIds].join(",")}`);
        if (lRes.ok) {
          const likesData = await lRes.json();
          likesByPostId = new Map(Object.entries(likesData));
        }
      } else {
        const lRes = await fetch(`/api/likes?postId=${topicId}`);
        if (lRes.ok) {
          const likesData = await lRes.json();
          likesByPostId.set(topicId, Array.isArray(likesData.userIds) ? likesData.userIds : []);
        }
      }
      
      const repliesWithDetails = repliesData.map((reply) => ({
        ...reply,
        comments: commentsByPostId.get(reply.id) || [],
        likesUserIds: likesByPostId.get(reply.id) || [],
      }));

      if (topicData) {
        setTopic((prev) => {
          const source = prev || { ...topicData, comments: [] };
          return {
            ...source,
            likesUserIds: likesByPostId.get(topicData.id) || [],
          };
        });
      }

      // すべてのauthorEmailを収集（トピック、返信、コメント）
      const allEmails = new Set<string>();
      if (topicData?.authorEmail) allEmails.add(topicData.authorEmail);
      repliesWithDetails.forEach(reply => {
        if (reply.authorEmail) allEmails.add(reply.authorEmail);
        (reply.likesUserIds || []).forEach((userId: string) => {
          if (userId.includes("@")) allEmails.add(userId);
        });
        reply.comments?.forEach((comment: any) => {
          if (comment.authorEmail) allEmails.add(comment.authorEmail);
        });
      });
      (likesByPostId.get(topicId) || []).forEach((userId: string) => {
        if (userId.includes("@")) allEmails.add(userId);
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

  const getLikeParticipants = (post: Post) => {
    return (post.likesUserIds || []).map((userId) => {
      const isMember = userId.includes("@");
      return {
        key: userId,
        icon: isMember ? getDisplayIcon(userId) : null,
        name: isMember ? getDisplayName(userId, "部員") : "ゲスト",
      };
    });
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
    const userId = session?.user?.email || getAnonymousUserId();
    const likeDelta = isLiked ? -1 : 1;

    const method = isLiked ? "DELETE" : "POST";

    const updateLikeState = (delta: number) => {
      setTopic((prev) => {
        if (!prev || prev.id !== postId) return prev;
        const currentUsers = prev.likesUserIds || [];
        const nextUsers = delta > 0
          ? (currentUsers.includes(userId) ? currentUsers : [...currentUsers, userId])
          : currentUsers.filter((id) => id !== userId);
        return {
          ...prev,
          likes: Math.max((prev.likes || 0) + delta, 0),
          likesUserIds: nextUsers,
        };
      });

      setReplies((prev) =>
        prev.map((reply) => {
          if (reply.id !== postId) return reply;
          const currentUsers = reply.likesUserIds || [];
          const nextUsers = delta > 0
            ? (currentUsers.includes(userId) ? currentUsers : [...currentUsers, userId])
            : currentUsers.filter((id) => id !== userId);
          return {
            ...reply,
            likes: Math.max((reply.likes || 0) + delta, 0),
            likesUserIds: nextUsers,
          };
        })
      );
    };

    // 先にUIだけ反映して体感レスポンスを上げる
    updateLikeState(likeDelta);

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
        updateLikeState(-likeDelta);
      }
    } catch (error) {
      console.error("いいね操作エラー:", error);
      updateLikeState(-likeDelta);
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
                likedPosts.includes(topic.id)
                  ? "bg-pink-400 text-white border-white"
                  : "bg-gray-200 text-black border-black"
              } flex items-center gap-2`}
            >
              <HandDrawnHeartIcon size={13} filled={likedPosts.includes(topic.id)} /> {topic.likes || 0}
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
                        likedPosts.includes(reply.id)
                          ? "bg-pink-400 text-white border-white"
                          : "bg-gray-200 text-black border-black"
                      } flex items-center gap-2`}
                    >
                      <HandDrawnHeartIcon size={13} filled={likedPosts.includes(reply.id)} /> {reply.likes || 0}
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
      <style jsx global>{`
        .chrome-theme-detail .font-black,
        .chrome-theme-detail .font-bold,
        .chrome-theme-detail .font-semibold {
          font-weight: 400 !important;
        }

        .chrome-theme-detail h1,
        .chrome-theme-detail h2,
        .chrome-theme-detail h3 {
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
}
