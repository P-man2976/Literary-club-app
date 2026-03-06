"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserIconUrl } from "@/app/lib/imageUtils";
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
  Badge
} from "@heroui/react";
import { Lightbulb, Pin, Save, Users } from "lucide-react";


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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionLoadTimedOut, setSessionLoadTimedOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);
  const [isTopicDecisionModalOpen, setIsTopicDecisionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"proposal" | "topics" | "members">("topics");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [topicPosts, setTopicPosts] = useState<Post[]>([]);
  const [topicProposals, setTopicProposals] = useState<Post[]>([]);
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
  const [topicDecisionSource, setTopicDecisionSource] = useState<"proposal" | "pool">("proposal");
  const [proposalDeadline, setProposalDeadline] = useState<number | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    const allPostsData: Post[] = await res.json();
    
    if (Array.isArray(allPostsData)) {
      const postsWithAll = allPostsData;

      const allEmails = new Set<string>();
      postsWithAll.forEach(post => {
        if (post.authorEmail) allEmails.add(post.authorEmail);
      });

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
      
      const allSorted = postsWithAll.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllPosts(allSorted);
      
      const topics = postsWithAll.filter(p => p.isTopicPost === 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const proposals = postsWithAll.filter(p => p.tag === "お題案" && p.isTopicPost !== 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const regular = postsWithAll.filter(p => !p.parentPostId && p.isTopicPost !== 1 && p.tag !== "お題案").sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      const topicsWithChildren = topics.map(topic => {
        const children = postsWithAll.filter(p => p.parentPostId === topic.id);
        return { ...topic, children };
      });
      
      setTopicPosts(topicsWithChildren);
      setTopicProposals(proposals);
      setPosts(regular);

      try {
        const membersRes = await fetch("/api/profiles");
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMemberProfiles(Array.isArray(membersData.profiles) ? membersData.profiles : []);
        }
      } catch (error) {
        console.error("部員プロフィール取得エラー:", error);
      }
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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
        fetchPosts();
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
        fetchPosts();
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
        await fetchPosts();
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
        await fetchPosts();
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
        alert("返信を投稿しました！");
        setReplyTexts({ ...replyTexts, [topicId]: { title: "", body: "" } });
        fetchPosts();
      } else {
        const error = await response.json();
        console.error("返信エラー:", error);
        alert("返信の投稿に失敗しました: " + (error.error || "不明なエラー"));
      }
    } catch (error) {
      console.error("返信エラー:", error);
      alert("返信の投稿に失敗しました");
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
                     effectiveMode === "reply" ? "返信を投稿しました！" : "保存しました！";
        alert(mode);
        setNewPost({ title: "", body: "", tag: "創作" });
        setPostingMode("regular");
        setSelectedTopicId(null);
        onClose();
        fetchPosts();
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
    return <div className="p-10 text-center text-default-500">読み込み中...</div>;
  }

  if (status === "loading" && sessionLoadTimedOut) {
    return (
      <div className="p-10 text-center space-y-4">
        <p className="text-default-700 font-semibold">セッション確認に時間がかかっています</p>
        <p className="text-default-500 text-sm">通信状況により認証確認が遅れる場合があります。</p>
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
  const hasDecisionCandidates = topicProposals.length > 0 || pastTopicPool.length > 0;

  const selectRandomCandidate = () => {
    if (topicDecisionSource === "proposal") {
      if (topicProposals.length === 0) {
        alert("お題案がまだありません");
        return;
      }
      const randomIndex = Math.floor(Math.random() * topicProposals.length);
      const randomProposal = topicProposals[randomIndex];
      setSelectedProposalId(randomProposal.id);
      setSelectedPoolTopicId(null);
      return;
    }

    if (pastTopicPool.length === 0) {
      alert("過去お題プールがまだありません");
      return;
    }
    const randomIndex = Math.floor(Math.random() * pastTopicPool.length);
    const randomTopic = pastTopicPool[randomIndex];
    setSelectedPoolTopicId(randomTopic.id);
    setSelectedProposalId(null);
  };

  return (
    <main className="min-h-screen max-w-2xl mx-auto pb-40">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-divider p-4 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black">文芸部ポータル</h1>
          
          {session ? (
            <Link href="/settings" aria-label="設定" className="block">
              {getUserIconUrl(session.user?.email, userIcon) ? (
                <img
                  src={getUserIconUrl(session.user?.email, userIcon) || ""}
                  alt="プロフィール"
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-default-200 border-2 border-primary" />
              )}
            </Link>
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
        onSelectionChange={(key) => setActiveTab(key as "proposal" | "topics" | "members")}
        variant="underlined"
        color="primary"
        classNames={{
          base: "sticky top-[73px] bg-background z-20 border-b border-divider px-0",
          tabList: "w-full !grid !grid-cols-3 gap-0 md:!flex md:justify-center md:gap-2",
          cursor: "w-full h-[3px]",
          tab: "h-12 w-full max-w-none justify-center data-[selected=true]:font-black data-[selected=true]:text-primary md:flex-none md:w-[180px]",
          tabContent: "group-data-[selected=true]:text-primary group-data-[selected=false]:text-default-500",
        }}
      >
        <Tab
          key="topics"
          title={
            <span className="flex items-center gap-1">
              <Pin size={14} />
              お題
            </span>
          }
        >
          {topicPosts.length === 0 ? (
            <div className="p-10 text-center">
              <Pin size={34} className="mx-auto mb-4 text-default-400" />
              <p className="text-default-500 text-sm font-medium">まだお題がありません</p>
              <p className="text-default-400 text-xs mt-2">お題案投稿タブで案を投稿し、選択してお題化できます。</p>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {topicPosts.map((topic) => (
                <Card 
                  key={topic.id}
                  shadow="sm"
                  className="border border-default-200 rounded-2xl"
                >
                  <CardBody className="p-4 gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDisplayIcon(topic.authorEmail) ? (
                          <img
                            src={getDisplayIcon(topic.authorEmail) || ""}
                            alt="投稿者アイコン"
                            className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full object-cover border border-default-300"
                          />
                        ) : (
                          <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-default-200 border border-default-300" />
                        )}
                        <span className="font-bold">{getDisplayName(topic.authorEmail, topic.author)}</span>
                        <Chip size="sm" color="secondary" variant="flat">お題</Chip>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-default-400 text-sm">
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
                                      className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-default-300 text-[10px] font-bold text-default-700 border-2 border-background flex items-center justify-center"
                                    >
                                      {participant.name.slice(0, 1)}
                                    </div>
                                  )
                                ))}
                              {getTopicParticipants(topic).length > 6 && (
                                <div className="w-7 h-7 min-w-7 min-h-7 shrink-0 rounded-full bg-default-200 text-[10px] font-bold text-default-600 border-2 border-background flex items-center justify-center">
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
                      <p className="text-sm text-default-600 line-clamp-2">{topic.body}</p>
                      <p className="text-xs text-default-400">クリックして詳細ページを表示...</p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {session && (
            <button
              className="fixed right-6 bottom-24 z-40 w-14 h-14 rounded-full bg-primary text-white text-3xl leading-none font-light shadow-lg hover:scale-105 transition-transform"
              onClick={() => {
                if (!hasDecisionCandidates) {
                  alert("候補がありません。まずお題案を投稿してください。");
                  return;
                }
                setTopicDecisionSource(topicProposals.length > 0 ? "proposal" : "pool");
                setSelectedProposalId(null);
                setSelectedPoolTopicId(null);
                setProposalDeadline(null);
                setIsTopicDecisionModalOpen(true);
              }}
              aria-label="お題を決定"
              title={hasDecisionCandidates ? "お題を決定" : "候補がありません"}
            >
              +
            </button>
          )}
        </Tab>

        <Tab
          key="proposal"
          title={
            <span className="flex items-center gap-1">
              <Lightbulb size={14} />
              お題案投稿
            </span>
          }
        >
          <div className="p-4 space-y-4">
            {session && (
              <Card shadow="sm" className="border border-default-200 rounded-2xl">
                <CardBody className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="お題案タイトル"
                      value={newPost.title || ""}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    />
                    <button
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50"
                      disabled={!newPost.title || !newPost.body}
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
                            setNewPost({ title: "", body: "", tag: "お題案" });
                            await fetchPosts();
                            router.refresh();
                          }
                        });
                      }}
                    >
                      投稿
                    </button>
                  </div>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[88px]"
                    placeholder="内容"
                    value={newPost.body || ""}
                    onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  />
                </CardBody>
              </Card>
            )}

            <Card shadow="sm" className="border border-default-200 rounded-2xl">
              <CardBody className="p-4 space-y-3">
                <p className="text-sm text-default-500">お題の決定は「お題」タブ右下の + ボタンから行えます。</p>
              </CardBody>
            </Card>

            {topicProposals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold">過去のお題案</h3>
                {topicProposals.map((proposal) => (
                  <Card key={proposal.id} shadow="sm" className="border border-default-200 rounded-2xl cursor-pointer hover:shadow-md transition-shadow">
                    <CardBody className="p-4 space-y-2">
                      <h4 className="font-semibold text-base text-default-700">{proposal.title}</h4>
                      <p className="text-sm text-default-600 line-clamp-3">{proposal.body}</p>
                      <div className="flex items-center justify-between text-xs text-default-500 pt-2">
                        <span>投稿者: {getDisplayName(proposal.authorEmail, proposal.author)}</span>
                        <span>{new Date(proposal.createdAt * 1000).toLocaleDateString()}</span>
                      </div>
                      {session?.user?.email === proposal.authorEmail && (
                        <button
                          onClick={() => {
                            if (confirm("このお題案を削除しますか？")) {
                              fetch(`/api/posts?postId=${proposal.id}`, {
                                method: "DELETE",
                              }).then((res) => {
                                if (res.ok) {
                                  alert("削除しました！");
                                  fetchPosts();
                                }
                              });
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold mt-2"
                        >
                          削除
                        </button>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
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

                      <div className="rounded-lg bg-default-50 dark:bg-default-100/10 p-3">
                        <p className="text-xs text-default-500 mb-1">自己紹介</p>
                        <p className="text-sm font-medium text-default-700">{member.selfIntro || "未設定"}</p>
                      </div>

                      <div className="rounded-lg bg-primary-50/70 dark:bg-primary-900/20 p-3">
                        <p className="text-xs text-default-500 mb-1">AI短文分析</p>
                        <p className="text-sm text-default-700 dark:text-default-300">
                          {member.aiSummary || "過去投稿ベースのAI分析は準備中です。"}
                        </p>
                      </div>

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
            className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-2xl w-full"
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
                    「お題案投稿」タブからお題案を投稿してください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">候補元</p>
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                          topicDecisionSource === "proposal"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => {
                          setTopicDecisionSource("proposal");
                          setSelectedPoolTopicId(null);
                        }}
                        disabled={topicProposals.length === 0}
                      >
                        お題案投稿タブ
                      </button>
                      <button
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                          topicDecisionSource === "pool"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => {
                          setTopicDecisionSource("pool");
                          setSelectedProposalId(null);
                        }}
                        disabled={pastTopicPool.length === 0}
                      >
                        過去お題プール
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <select
                      className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      value={topicDecisionSource === "proposal" ? (selectedProposalId || "") : (selectedPoolTopicId || "")}
                      onChange={(e) => {
                        if (topicDecisionSource === "proposal") {
                          setSelectedProposalId(e.target.value || null);
                          setSelectedPoolTopicId(null);
                        } else {
                          setSelectedPoolTopicId(e.target.value || null);
                          setSelectedProposalId(null);
                        }
                      }}
                    >
                      <option value="">{topicDecisionSource === "proposal" ? "お題案を選択" : "過去お題を選択"}</option>
                      {(topicDecisionSource === "proposal" ? topicProposals : pastTopicPool).map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={selectRandomCandidate}
                      disabled={topicDecisionSource === "proposal" ? topicProposals.length === 0 : pastTopicPool.length === 0}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ランダム
                    </button>
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

                  {(topicDecisionSource === "proposal" ? selectedProposal : selectedPoolTopic) ? (
                    <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {(topicDecisionSource === "proposal" ? selectedProposal : selectedPoolTopic)?.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-4">
                        {(topicDecisionSource === "proposal" ? selectedProposal : selectedPoolTopic)?.body}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {topicDecisionSource === "proposal" ? "お題案を選択してください。" : "過去お題を選択してください。"}
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
                  if (topicDecisionSource === "proposal" && selectedProposalId && proposalDeadline) {
                    convertProposalToTopic(selectedProposalId, proposalDeadline);
                    return;
                  }
                  if (topicDecisionSource === "pool" && selectedPoolTopicId && proposalDeadline) {
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
            className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
    </main>
  );
}
