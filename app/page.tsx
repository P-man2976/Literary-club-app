"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Button, 
  Card, 
  CardHeader,
  CardBody, 
  Tabs, 
  Tab, 
  Avatar, 
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  useDisclosure,
  Divider,
  Badge
} from "@heroui/react";


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
  comments?: Comment[];
  likes?: number;
  children?: Post[]; // 返信投稿を格納
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isOpen, onClose } = useDisclosure();
  const [activeTab, setActiveTab] = useState<"all" | "topics">("all");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [topicPosts, setTopicPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [userIcon, setUserIcon] = useState<string | null>(null);
  const [postingMode, setPostingMode] = useState<"regular" | "topic" | "reply">("regular");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: { title: string; body: string } }>({});
  const [penName, setPenName] = useState("");
  const [penNameMap, setPenNameMap] = useState<{ [email: string]: string }>({});
  const [userIconMap, setUserIconMap] = useState<{ [email: string]: string }>({});

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    const allPostsData: Post[] = await res.json();
    
    if (Array.isArray(allPostsData)) {
      const postsWithAll = await Promise.all(allPostsData.map(async (post) => {
        const [cRes, lRes] = await Promise.all([
          fetch(`/api/comments?postId=${post.id}`),
          fetch(`/api/likes?postId=${post.id}`)
        ]);
        const comments = await cRes.json();
        const likesData = await lRes.json();
        
        return { ...post, comments, likes: likesData.count };
      }));

      const allEmails = new Set<string>();
      postsWithAll.forEach(post => {
        if (post.authorEmail) allEmails.add(post.authorEmail);
        post.comments?.forEach((comment: any) => {
          if (comment.authorEmail) allEmails.add(comment.authorEmail);
        });
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
      const regular = postsWithAll.filter(p => !p.parentPostId && p.isTopicPost !== 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      const topicsWithChildren = topics.map(topic => {
        const children = postsWithAll.filter(p => p.parentPostId === topic.id);
        return { ...topic, children };
      });
      
      setTopicPosts(topicsWithChildren);
      setPosts(regular);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const savedLikes = localStorage.getItem("lit-club-liked-ids");
    if (savedLikes) {
      setLikedPosts(JSON.parse(savedLikes));
    }
    fetchPosts();
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
    if (authorEmail && userIconMap[authorEmail]) {
      return userIconMap[authorEmail];
    }
    return null;
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

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isLiked = likedPosts.includes(postId);
    const userId = session?.user?.email || "guest";
    const method = isLiked ? "DELETE" : "POST";

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
        fetchPosts();
      }
    } catch (error) {
      console.error("操作に失敗しました", error);
    }
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
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
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
          const textElements = doc.getElementsByTagName("w:t");
          let text = "";
          for (let i = 0; i < textElements.length; i++) {
            text += textElements[i].textContent || "";
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


  if (status === "loading") return <div className="p-10 text-center text-default-500">読み込み中...</div>;

  return (
    <main className="min-h-screen max-w-2xl mx-auto pb-40">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-divider p-4 z-30">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black">文芸部ポータル</h1>
          
          {session ? (
            <Link href="/settings" aria-label="設定" className="block">
              {userIcon || session.user?.image ? (
                <img
                  src={userIcon || session.user?.image || ""}
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
        onSelectionChange={(key) => setActiveTab(key as "all" | "topics")}
        variant="underlined"
        color="primary"
        classNames={{
          base: "sticky top-[73px] bg-background z-20",
          tabList: "w-full",
          cursor: "w-full",
          tab: "h-12",
        }}
      >
        <Tab key="all" title="📚 すべて">
          {allPosts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-4">📚</p>
              <p className="text-default-500 text-sm font-medium">まだ投稿がありません</p>
              <p className="text-default-400 text-xs mt-2">右下の+ボタンから最初の作品を投稿しましょう！</p>
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {allPosts.map((post) => (
                <Card 
                  key={post.id}
                  shadow="none"
                  radius="none"
                  className="border-0"
                >
                  <CardBody className="p-4 gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDisplayIcon(post.authorEmail) ? (
                          <img
                            src={getDisplayIcon(post.authorEmail) || ""}
                            alt="投稿者アイコン"
                            className="w-6 h-6 rounded-full object-cover border border-default-300"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-default-200 border border-default-300" />
                        )}
                        <span className="font-bold">{getDisplayName(post.authorEmail, post.author)}</span>
                        {post.isTopicPost === 1 ? (
                          <Chip size="sm" color="secondary" variant="flat">お題</Chip>
                        ) : post.parentPostId ? (
                          <Chip size="sm" color="success" variant="flat">返信</Chip>
                        ) : (
                          <Chip size="sm" variant="flat">{post.tag}</Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleLike(post.id, { stopPropagation: () => {} } as any)}
                          color={likedPosts.includes(post.id) ? "danger" : "default"}
                        >
                          <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={likedPosts.includes(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                            </svg>
                            <span className="text-xs font-bold">{post.likes || 0}</span>
                          </div>
                        </Button>
                        <div className="flex items-center gap-1 text-default-400 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9A9 9 0 1 1 5.9 5.9l1.1 1.1"/></svg>
                          <span className="text-xs font-bold">{post.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div 
                      onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)}
                      className="cursor-pointer"
                    >
                      <h2 className="text-lg font-bold">{post.title}</h2>
                      <p className="text-xs text-default-400">
                      {new Date(post.createdAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      </p>
                    </div>
                    {openPostId === post.id ? (
                      <Card className="mt-2" shadow="sm">
                        <CardBody>
                          <div className="flex justify-between items-start gap-2">
                            <p className="whitespace-pre-wrap text-sm flex-1">
                              {post.body}
                            </p>
                            {session?.user?.name === post.author && (
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="light"
                                onPress={() => deletePost(post.id)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </Button>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    ) : (
                      <p className="text-default-400 text-xs">クリックして内容を読む...</p>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </Tab>

        <Tab key="topics" title="📌 お題">
          {topicPosts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-4">📌</p>
              <p className="text-default-500 text-sm font-medium">まだお題がありません</p>
              <p className="text-default-400 text-xs mt-2">右下の+ボタンから最初のお題を作成しましょう！</p>
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {topicPosts.map((topic) => (
                <Card 
                  key={topic.id}
                  shadow="none"
                  radius="none"
                  className="border-0"
                >
                  <CardBody className="p-4 gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDisplayIcon(topic.authorEmail) ? (
                          <img
                            src={getDisplayIcon(topic.authorEmail) || ""}
                            alt="投稿者アイコン"
                            className="w-6 h-6 rounded-full object-cover border border-default-300"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-default-200 border border-default-300" />
                        )}
                        <span className="font-bold">{getDisplayName(topic.authorEmail, topic.author)}</span>
                        <Chip size="sm" color="secondary" variant="flat">お題</Chip>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => handleLike(topic.id, { stopPropagation: () => {} } as any)}
                          color={likedPosts.includes(topic.id) ? "danger" : "default"}
                        >
                          <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={likedPosts.includes(topic.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                            </svg>
                            <span className="text-xs font-bold">{topic.likes || 0}</span>
                          </div>
                        </Button>
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
                                      className="w-6 h-6 rounded-full object-cover border-2 border-background"
                                    />
                                  ) : (
                                    <div
                                      key={participant.key}
                                      title={participant.name}
                                      className="w-6 h-6 rounded-full bg-default-300 text-[10px] font-bold text-default-700 border-2 border-background flex items-center justify-center"
                                    >
                                      {participant.name.slice(0, 1)}
                                    </div>
                                  )
                                ))}
                              {getTopicParticipants(topic).length > 6 && (
                                <div className="w-6 h-6 rounded-full bg-default-200 text-[10px] font-bold text-default-600 border-2 border-background flex items-center justify-center">
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
        </Tab>
      </Tabs>

      {/* 投稿モーダル */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {postingMode === "topic" ? "📌 お題を作成" : "💾 作品を投稿"}
              </ModalHeader>
              <ModalBody>
                {postingMode === "topic" ? (
                  <div className="space-y-4">
                    <Input
                      label="お題のタイトル"
                      placeholder="例：【3月15日まで】夏祭り"
                      value={newPost.title || ""}
                      onValueChange={(value) => setNewPost({ ...newPost, title: value })}
                    />
                    <Textarea
                      label="お題の説明"
                      placeholder="お題の説明を入力..."
                      value={newPost.body || ""}
                      onValueChange={(value) => setNewPost({ ...newPost, body: value })}
                      minRows={4}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input 
                      type="file" 
                      accept=".txt,.pdf,.docx" 
                      onChange={handleFileChange}
                      className="block w-full text-sm text-default-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        hover:file:bg-primary-100"
                    />
                    
                    {newPost.title && (
                      <>
                        <Input
                          label="タイトル"
                          value={newPost.title || ""}
                          onValueChange={(value) => setNewPost({ ...newPost, title: value })}
                        />
                        <Textarea
                          label="本文"
                          value={newPost.body || ""}
                          onValueChange={(value) => setNewPost({ ...newPost, body: value })}
                          minRows={8}
                        />
                      </>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  キャンセル
                </Button>
                <Button 
                  color="primary" 
                  onPress={() => saveToAWS(postingMode)}
                  isDisabled={!newPost.title || !newPost.body}
                >
                  {postingMode === "topic" ? "お題を公開" : "保存を実行"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
