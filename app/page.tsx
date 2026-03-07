"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserIconUrl } from "@/app/lib/imageUtils";
import useSWR from "swr";
import { 
  Button, 
  Card, 
  CardHeader,
  CardBody, 
  Tabs, 
  Tab, 
  Avatar, 
  Chip,
  Divider,
  Badge,
  Spinner
} from "@heroui/react";
import { Lightbulb, Pin, Save, Users, AlertCircle, Settings, MessageCircle, Heart } from "lucide-react";


// 型定義
type Comment = {
  commentId: string;
  text: string;
  author: string;
  authorEmail?: string | null;
  createdAt: number;
};
type Post = {
  id: string;
  author: string;
  authorEmail?: string | null;
  title: string;
  body: string;
  tag: string;
  createdAt: number;
  parentPostId?: string | null;
  isTopicPost?: number;
  deadline?: number | null;
  comments?: Comment[];
  commentCount?: number;
  likes?: number;
  children?: Post[]; // 返信投稿を格納
};

type MemberProfile = {
  email: string;
  penName: string;
  userIcon: string | null;
  selfIntro: string;
  aiSummary: string;
  aiTags: string[];
  updatedAt: number;
};

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('データの取得に失敗しました');
  return res.json();
});

export default function Home() {
  const aiReadingSettingKey = "lit-club-ai-reading-enabled";
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);
  const [isTopicDecisionModalOpen, setIsTopicDecisionModalOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "topics" | "members">("posts");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [topicPosts, setTopicPosts] = useState<Post[]>([]);
  const [topicProposals, setTopicProposals] = useState<Post[]>([]);
  const [freePosts, setFreePosts] = useState<Post[]>([]);
  const [topicReplies, setTopicReplies] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [userIcon, setUserIcon] = useState<string | null>(null);
  const [postingMode, setPostingMode] = useState<"regular" | "topic" | "reply">("regular");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: { title: string; body: string } }>({});
  const [penName, setPenName] = useState("");
  const [penNameMap, setPenNameMap] = useState<{ [email: string]: string }>({});
  const [userIconMap, setUserIconMap] = useState<{ [email: string]: string }>({});
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedPoolTopicId, setSelectedPoolTopicId] = useState<string | null>(null);
  const [proposalDeadline, setProposalDeadline] = useState<number | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editingProposalTitle, setEditingProposalTitle] = useState("");
  const [editingProposalBody, setEditingProposalBody] = useState("");
  const [aiReadingEnabled, setAiReadingEnabled] = useState(true);

  // SWRでデータ取得
  const { data: allPostsData, error: postsError, isLoading: postsLoading, mutate: mutatePosts } = useSWR<Post[]>('/api/posts', fetcher, {
    refreshInterval: 30000, // 30秒ごとに自動リフェッチ
    revalidateOnFocus: true,
  });

  const { data: memberProfilesData, error: profilesError } = useSWR('/api/profiles', fetcher, {
    refreshInterval: 60000, // 60秒ごとに自動リフェッチ
  });

  // SWRで取得したデータを処理
  useEffect(() => {
    if (!allPostsData || !Array.isArray(allPostsData)) return;

    const postsWithAll = allPostsData;

    const allEmails = new Set<string>();
    postsWithAll.forEach(post => {
      if (post.authorEmail) allEmails.add(post.authorEmail);
    });

    if (allEmails.size > 0) {
      fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: Array.from(allEmails) }),
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(({ penNameMap: fetchedMap, userIconMap: fetchedIconMap }) => {
          setPenNameMap(fetchedMap || {});
          setUserIconMap(fetchedIconMap || {});
        })
        .catch(error => console.error("ペンネーム取得エラー:", error));
    }

    const allSorted = postsWithAll.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    setAllPosts(allSorted);

    // お題
    const topics = postsWithAll.filter(p => p.isTopicPost === 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    // お題案
    const proposals = postsWithAll.filter(p => p.tag === "お題案" && p.isTopicPost !== 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    // 自由投稿（お題に紐づかない投稿）
    const free = postsWithAll.filter(p => !p.parentPostId && p.isTopicPost !== 1 && p.tag !== "お題案").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    // お題への投稿（返信）
    const replies = postsWithAll.filter(p => p.parentPostId && p.isTopicPost !== 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const topicsWithChildren = topics.map(topic => {
      const children = postsWithAll.filter(p => p.parentPostId === topic.id);
      return { ...topic, children };
    });

    setTopicPosts(topicsWithChildren);
    setTopicProposals(proposals);
    setPosts(free);
    setFreePosts(free);
    setTopicReplies(replies);
  }, [allPostsData]);

  // 部員プロフィールデータの処理
  useEffect(() => {
    if (memberProfilesData) {
      setMemberProfiles(Array.isArray(memberProfilesData.profiles) ? memberProfilesData.profiles : []);
    }
  }, [memberProfilesData]);

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setPenName(data.penName || "");
          setUserIcon(data.userIcon || null);
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

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
    if (!editingProposalTitle.trim() || !editingProposalBody.trim()) {
      alert("タイトルと内容は必須です");
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: proposalId,
          title: editingProposalTitle,
          body: editingProposalBody,
          authorEmail: session?.user?.email,
        }),
      });

      if (response.ok) {
        alert("更新しました！");
        cancelEditingProposal();
        mutatePosts();
      } else {
        const error = await response.json();
        alert(`更新に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("編集エラー:", error);
      alert("編集に失敗しました");
    }
  };

  const getTopicParticipants = (topic: Post) => {
    const seen = new Set<string>();
    const participants: Array<{ key: string; name: string; icon: string | null }> = [];

    (topic.children || []).forEach((child) => {
      const key = child.authorEmail || `name:${child.author}`;
      if (seen.has(key)) return;

      seen.add(key);
      participants.push({
        key,
        name: getDisplayName(child.authorEmail, child.author),
        icon: getDisplayIcon(child.authorEmail),
      });
    });

    return participants;
  };

  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});

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
        alert("感想を送信しました！");
        mutatePosts();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("本当に削除しますか？")) return;
    
    try {
      const response = await fetch(`/api/posts?postId=${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("削除しました！");
        mutatePosts();
      }
    } catch (error) {
      console.error("削除に失敗しました", error);
    }
  };

  // お題案をお題に変換
  const convertProposalToTopic = async (proposalId: string, deadline: number) => {
    try {
      const proposal = topicProposals.find(p => p.id === proposalId);
      if (!proposal) {
        alert("お題案が見つかりません");
        return;
      }

      const topicData: any = {
        ...proposal,
        isTopicPost: 1,
        deadline: deadline,
        tag: "お題",
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicData),
      });

      if (response.ok) {
        alert("お題を追加しました！");
        setProposalDeadline(null);
        setSelectedProposalId(null);
        setIsTopicDecisionModalOpen(false);
        await mutatePosts();
      } else {
        const error = await response.text();
        alert("エラー: " + error);
      }
    } catch (error) {
      console.error("お題への変換に失敗しました", error);
      alert("お題への変換に失敗しました");
    }
  };

  const convertPoolTopicToTopic = async (poolTopicId: string, deadline: number) => {
    try {
      const poolTopic = topicPosts.find((t) => t.id === poolTopicId && !!t.deadline && t.deadline < Date.now());
      if (!poolTopic) {
        alert("過去お題が見つかりません");
        return;
      }

      const topicData: any = {
        title: poolTopic.title,
        body: poolTopic.body,
        tag: "お題",
        isTopicPost: 1,
        deadline,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicData),
      });

      if (response.ok) {
        alert("過去お題プールからお題を追加しました！");
        setProposalDeadline(null);
        setSelectedProposalId(null);
        setSelectedPoolTopicId(null);
        setIsTopicDecisionModalOpen(false);
        await mutatePosts();
      } else {
        const error = await response.text();
        alert("エラー: " + error);
      }
    } catch (error) {
      console.error("過去お題からのお題作成に失敗しました", error);
      alert("過去お題からのお題作成に失敗しました");
    }
  };

  const saveReplyInTopic = async (topicId: string) => {
    const reply = replyTexts[topicId];
    if (!reply || !reply.title || !reply.body) {
      alert("タイトルと本文を入力してください");
      return;
    }

    try {
      const postData = {
        title: reply.title,
        body: reply.body,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
        tag: "創作",
        parentPostId: topicId,
        isTopicPost: 0,
      };

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        alert("投稿しました！");
        setReplyTexts({ ...replyTexts, [topicId]: { title: "", body: "" } });
        mutatePosts();
      } else {
        const error = await response.json();
        console.error("投稿エラー:", error);
        alert("投稿に失敗しました: " + (error.error || "不明なエラー"));
      }
    } catch (error) {
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
    }
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
          const paragraphs = doc.getElementsByTagName("w:p");
          let text = "";

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

          // Wordの段落・改行タグを保持してテキスト化
          for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            text += readNodeText(paragraph);
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
  
  const saveToAWS = async (forceMode?: "topic" | "regular" | "reply") => {
    if (!newPost.title || !newPost.body) return;
    try {
      const effectiveMode = forceMode || postingMode;
      const postData: any = {
        ...newPost,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
      };

      if (effectiveMode === "topic") {
        postData.isTopicPost = 1;
        postData.parentPostId = null;
      } else if (effectiveMode === "reply" && selectedTopicId) {
        postData.parentPostId = selectedTopicId;
        postData.isTopicPost = 0;
      } else {
        postData.parentPostId = null;
        postData.isTopicPost = 0;
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        const mode = effectiveMode === "topic" ? "お題を作成しました！" : 
                     effectiveMode === "reply" ? "投稿しました！" : "保存しました！";
        alert(mode);
        setNewPost({ title: "", body: "", tag: "創作" });
        setPostingMode("regular");
        setSelectedTopicId(null);
        onClose();
        mutatePosts();
      } else {
        const errorText = await response.text();
        console.error("投稿エラー:", response.status, errorText);
        try {
          const error = JSON.parse(errorText);
          alert("投稿に失敗しました: " + (error.error || errorText));
        } catch {
          alert("投稿に失敗しました: " + errorText);
        }
      }
    } catch (error) { 
      console.error("投稿エラー:", error);
      alert("投稿に失敗しました");
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

  const pastTopicPool = topicPosts.filter((topic) => !!topic.deadline && topic.deadline < Date.now());
  const decisionCandidates = [
    ...topicProposals.map((candidate) => ({ ...candidate, source: "proposal" as const })),
    ...pastTopicPool.map((candidate) => ({ ...candidate, source: "pool" as const })),
  ];
  const selectedDecisionCandidate = selectedProposal || selectedPoolTopic;
  const hasDecisionCandidates = topicProposals.length > 0 || pastTopicPool.length > 0;

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
    <main className="min-h-screen max-w-3xl mx-auto pb-40">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-divider p-4 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black">文芸部ポータル</h1>
          
          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                aria-label="設定"
                className="w-10 h-10 rounded-full border border-gray-300 bg-gray-100/60 dark:bg-slate-800/60 flex items-center justify-center"
              >
                <Settings size={18} />
              </Link>
              <Link href="/settings/profile" aria-label="アカウント設定" className="block">
                {getUserIconUrl(session.user?.email, userIcon) ? (
                  <img
                    src={getUserIconUrl(session.user?.email, userIcon) || ""}
                    alt="プロフィール"
                    className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-primary" />
                )}
              </Link>
            </div>
          ) : (
            <Button 
              onPress={() => signIn("google")}
              color="primary"
              size="sm"
              radius="full"
            >
              ログイン
            </Button>
          )}
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
          base: "sticky top-[73px] w-full bg-background z-20 border-b border-divider px-0",
          tabList: "w-full !grid !grid-cols-3 !gap-0 px-0",
          cursor: "w-full h-[3px]",
          tab: "h-12 w-full max-w-none !mx-0 !px-0 justify-center rounded-none data-[selected=true]:font-black data-[selected=true]:text-primary",
          tabContent: "group-data-[selected=true]:text-primary group-data-[selected=false]:text-gray-500",
        }}
      >
        <Tab
          key="posts"
          title={
            <span className="flex items-center gap-1">
              <Save size={14} />
              投稿
            </span>
          }
        >
          {/* 投稿タブのコンテンツ */}
          <div className="p-3 space-y-3">
            {(freePosts.length === 0 && topicReplies.length === 0) ? (
              <div className="p-10 text-center">
                <Save size={34} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-sm font-medium">まだ投稿がありません</p>
                <p className="text-gray-400 text-xs mt-2">右下のボタンから投稿を作成できます。</p>
              </div>
            ) : (
              <>
                {/* 全投稿を統合して時系列順に表示 */}
                {[...topicReplies, ...freePosts]
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((post) => {
                  const parentTopic = post.parentPostId ? topicPosts.find(t => t.id === post.parentPostId) : null;
                  const isTopicReply = !!post.parentPostId;
                  return (
                    <Card 
                      key={post.id}
                      shadow="sm"
                      className="border border-gray-200 rounded-2xl"
                    >
                      <CardBody className="p-4 gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getDisplayIcon(post.authorEmail) ? (
                              <img
                                src={getDisplayIcon(post.authorEmail) || ""}
                                alt="投稿者アイコン"
                                className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border border-gray-300"
                              />
                            ) : (
                              <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-200 border border-gray-300" />
                            )}
                            <span className="font-bold">{getDisplayName(post.authorEmail, post.author)}</span>
                            {isTopicReply && parentTopic ? (
                              <Chip size="sm" color="secondary" variant="flat">
                                お題: {parentTopic.title}
                              </Chip>
                            ) : (
                              <Chip size="sm" color="primary" variant="flat">自由投稿</Chip>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        
                        <div 
                          onClick={() => router.push(`/topic/${post.id}`)}
                          className="cursor-pointer"
                        >
                          <h3 className="text-lg font-bold mb-1">{post.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">{post.body}</p>
                          <p className="text-xs text-gray-400 mt-1">クリックして詳細を表示...</p>
                        </div>

                        {/* コメント数・いいね数表示 */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <MessageCircle size={14} />
                            {post.commentCount || 0} コメント
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={14} />
                            {post.likes || 0} いいね
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </>
            )}
          </div>

          {/* 投稿作成フロートボタン */}
          {session && (
            <button
              className="fixed right-6 bottom-24 z-40 h-12 rounded-full bg-primary text-white text-sm font-bold px-4 shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
              onClick={() => setIsPostModalOpen(true)}
              aria-label="投稿を作成"
            >
              + 投稿
            </button>
          )}
        </Tab>

        <Tab
          key="topics"
          title={
            <span className="flex items-center gap-1">
              <Pin size={14} />
              お題
            </span>
          }
        >
          {/* お題タブのコンテンツ */}
          <div className="p-3 space-y-3">
            {topicPosts.length === 0 ? (
              <div className="p-10 text-center">
                <Pin size={34} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-sm font-medium">まだお題がありません</p>
                <p className="text-gray-400 text-xs mt-2">右下のボタンからお題案を投稿し、お題を決定できます。</p>
              </div>
            ) : (
              <>
                {/* 今週のお題（最新のお題） */}
                {topicPosts.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold px-2">今週のお題</h2>
                    <Card 
                      shadow="sm"
                      className="border-2 border-primary rounded-2xl bg-primary-50/30 dark:bg-primary-900/20"
                    >
                      <CardBody className="p-4 gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getDisplayIcon(topicPosts[0].authorEmail) ? (
                              <img
                                src={getDisplayIcon(topicPosts[0].authorEmail) || ""}
                                alt="投稿者アイコン"
                                className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border border-gray-300"
                              />
                            ) : (
                              <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-200 border border-gray-300" />
                            )}
                            <span className="font-bold">{getDisplayName(topicPosts[0].authorEmail, topicPosts[0].author)}</span>
                            <Chip size="sm" color="secondary" variant="solid">今週のお題</Chip>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-gray-400 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9A9 9 0 1 1 5.9 5.9l1.1 1.1"/></svg>
                                <span className="text-xs font-bold">{topicPosts[0].children?.length || 0} 投稿</span>
                              </div>
                              {getTopicParticipants(topicPosts[0]).length > 0 && (
                                <div className="flex items-center -space-x-2">
                                  {getTopicParticipants(topicPosts[0])
                                    .slice(0, 6)
                                    .map((participant) => (
                                      participant.icon ? (
                                        <img
                                          key={participant.key}
                                          src={participant.icon}
                                          alt={participant.name}
                                          title={participant.name}
                                          className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border-2 border-background"
                                        />
                                      ) : (
                                        <div
                                          key={participant.key}
                                          title={participant.name}
                                          className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-300 text-[10px] font-bold text-gray-700 border-2 border-background flex items-center justify-center"
                                        >
                                          {participant.name.slice(0, 1)}
                                        </div>
                                      )
                                    ))}
                                  {getTopicParticipants(topicPosts[0]).length > 6 && (
                                    <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 border-2 border-background flex items-center justify-center">
                                      +{getTopicParticipants(topicPosts[0]).length - 6}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div 
                          onClick={() => router.push(`/topic/${topicPosts[0].id}`)}
                          className="cursor-pointer"
                        >
                          <h2 className="text-lg font-bold">{topicPosts[0].title}</h2>
                          {topicPosts[0].deadline && (
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                              締切: {formatDateTime(topicPosts[0].deadline)}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{topicPosts[0].body}</p>
                          <p className="text-xs text-gray-400">クリックして詳細ページを表示...</p>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                )}

                {/* お題決定ボタン */}
                {session && (
                  <Card shadow="sm" className="border border-blue-300 dark:border-blue-700 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-blue-900 dark:text-blue-200">新しいお題を決定</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">お題案からランダム選択、または手動で選んでお題化できます</p>
                        </div>
                        <button
                          onClick={() => {
                            if (!hasDecisionCandidates) {
                              alert("お題案がありません。まず右下のボタンからお題案を投稿してください。");
                              return;
                            }
                            setSelectedProposalId(null);
                            setSelectedPoolTopicId(null);
                            setProposalDeadline(null);
                            setIsTopicDecisionModalOpen(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm whitespace-nowrap"
                        >
                          お題決定
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* 過去のお題 */}
                {topicPosts.length > 1 && (
                  <div className="space-y-2">
                    <h3 className="text-base font-bold px-2 mt-4">過去のお題</h3>
                    {topicPosts.slice(1).map((topic) => (
                      <Card 
                        key={topic.id}
                        shadow="sm"
                        className="border border-gray-200 rounded-2xl"
                      >
                        <CardBody className="p-4 gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getDisplayIcon(topic.authorEmail) ? (
                                <img
                                  src={getDisplayIcon(topic.authorEmail) || ""}
                                  alt="投稿者アイコン"
                                  className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border border-gray-300"
                                />
                              ) : (
                                <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-200 border border-gray-300" />
                              )}
                              <span className="font-bold">{getDisplayName(topic.authorEmail, topic.author)}</span>
                              <Chip size="sm" color="default" variant="flat">過去のお題</Chip>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-gray-400 text-sm">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9A9 9 0 1 1 5.9 5.9l1.1 1.1"/></svg>
                                  <span className="text-xs font-bold">{topic.children?.length || 0} 投稿</span>
                                </div>
                                {getTopicParticipants(topic).length > 0 && (
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
                                            className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border-2 border-background"
                                          />
                                        ) : (
                                          <div
                                            key={participant.key}
                                            title={participant.name}
                                            className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-300 text-[10px] font-bold text-gray-700 border-2 border-background flex items-center justify-center"
                                          >
                                            {participant.name.slice(0, 1)}
                                          </div>
                                        )
                                      ))}
                                    {getTopicParticipants(topic).length > 6 && (
                                      <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 border-2 border-background flex items-center justify-center">
                                        +{getTopicParticipants(topic).length - 6}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div 
                            onClick={() => router.push(`/topic/${topic.id}`)}
                            className="cursor-pointer"
                          >
                            <h2 className="text-lg font-bold">{topic.title}</h2>
                            {topic.deadline && (
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                締切: {formatDateTime(topic.deadline)}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 line-clamp-2">{topic.body}</p>
                            <p className="text-xs text-gray-400">クリックして詳細ページを表示...</p>
                          </div>
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
              className="fixed right-6 bottom-24 z-40 h-12 rounded-full bg-orange-500 text-white text-sm font-bold px-4 shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
              onClick={() => setIsProposalModalOpen(true)}
              aria-label="お題案を投稿"
            >
              <Lightbulb size={16} />
              お題案
            </button>
          )}
        </Tab>

        <Tab
          key="members"
          title={
            <span className="flex items-center gap-1">
              <Users size={14} />
              部員紹介
            </span>
          }
        >
          <div className="p-4 space-y-3">
            {memberProfiles.length === 0 ? (
              <Card shadow="sm" className="border border-default-200 rounded-2xl">
                <CardBody className="p-6 text-center space-y-2">
                  <Users size={28} className="mx-auto text-default-400" />
                  <p className="text-sm font-semibold text-default-600">部員プロフィールはまだありません</p>
                  <p className="text-xs text-default-400">設定タブでペンネーム・自己紹介を登録すると表示されます。</p>
                </CardBody>
              </Card>
            ) : (
              memberProfiles.map((member) => {
                const iconUrl = getUserIconUrl(member.email, member.userIcon || undefined);
                const fallbackName = member.email ? member.email.split("@")[0] : "匿名部員";
                const displayName = member.penName || fallbackName;
                const displayTags = Array.isArray(member.aiTags) && member.aiTags.length > 0
                  ? member.aiTags.slice(0, 3)
                  : ["#文芸部", "#創作", "#部員紹介"];

                return (
                  <Card key={member.email} shadow="sm" className="border border-default-200 rounded-2xl">
                    <CardBody className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={`${displayName}のアイコン`}
                            className="w-12 h-12 rounded-full object-cover border border-default-300"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-default-200 border border-default-300" />
                        )}
                        <p className="font-bold text-base truncate">{displayName}</p>
                      </div>

                      <div className="rounded-lg bg-slate-50 dark:bg-slate-900/20 p-3">
                        <p className="text-xs text-default-500 mb-1">自己紹介</p>
                        <p className="text-sm font-medium text-default-700">{member.selfIntro || "未設定"}</p>
                      </div>

                      {(aiReadingEnabled || member.email !== session?.user?.email) && (
                        <div className="rounded-lg bg-primary-50/70 dark:bg-primary-900/30 p-3">
                          <p className="text-xs text-default-500 dark:text-slate-300 mb-1">AI短文分析</p>
                          <p className="text-sm text-default-700 dark:text-slate-100">
                            {member.aiSummary || "過去投稿ベースのAI分析は準備中です。"}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {displayTags.map((tag, index) => (
                          <Chip key={`${member.email}-${tag}-${index}`} size="sm" variant="flat" color="primary">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                );
              })
            )}
          </div>
        </Tab>
      </Tabs>

      {/* お題決定モーダル */}
      {isTopicDecisionModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsTopicDecisionModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Pin size={18} />
                お題を決定
              </h2>
              <button
                onClick={() => setIsTopicDecisionModalOpen(false)}
                className="text-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {/* ボディ */}
            <div className="p-6">
              {!hasDecisionCandidates ? (
                <div className="text-center py-8">
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">候補がまだありません</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
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
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ランダム
                      </button>
                      <button
                        type="button"
                        disabled
                        title="AIお題作成は準備中です"
                        className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
                      >
                        生成AI (準備中)
                      </button>
                    </div>

                    <select
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    onChange={(e) => {
                      if (e.target.value) {
                        setProposalDeadline(new Date(e.target.value).getTime());
                      } else {
                        setProposalDeadline(null);
                      }
                    }}
                  />

                  {selectedDecisionCandidate ? (
                    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedDecisionCandidate.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-4">
                        {selectedDecisionCandidate.body}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      候補を選択してください。
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-slate-700 p-6">
              <button
                onClick={() => setIsTopicDecisionModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 p-6 sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="text-xl font-bold">
                {postingMode === "topic" ? (
                  <span className="flex items-center gap-2">
                    <Pin size={18} />
                    お題を作成
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save size={18} />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Lightbulb size={18} />
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
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-slate-700 p-6">
              <button
                onClick={() => {
                  setIsProposalModalOpen(false);
                  setNewPost({ title: "", body: "", tag: "創作" });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
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
                      router.refresh();
                    } else {
                      alert("投稿に失敗しました");
                    }
                  }).catch(() => {
                    alert("投稿に失敗しました");
                  });
                }}
                disabled={!newPost.title || !newPost.body}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Save size={18} />
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
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-slate-700 p-6">
              <button
                onClick={() => {
                  setIsPostModalOpen(false);
                  setNewPost({ title: "", body: "", tag: "創作" });
                  setSelectedTopicId(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
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
                      router.refresh();
                    } else {
                      alert("投稿に失敗しました");
                    }
                  }).catch(() => {
                    alert("投稿に失敗しました");
                  });
                }}
                disabled={!newPost.title || !newPost.body}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
