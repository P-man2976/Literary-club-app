"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


// 型定義
type Comment = {
  commentId: string;
  text: string;
  author: string;
  createdAt: number;
};
type Post = {
  id: string;
  author: string;
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
  const [activeTab, setActiveTab] = useState<"all" | "topics">("all");
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [topicPosts, setTopicPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [postingMode, setPostingMode] = useState<"regular" | "topic" | "reply">("regular");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: { title: string; body: string } }>({});

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    const allPostsData: Post[] = await res.json();
    
    if (Array.isArray(allPostsData)) {
      const postsWithAll = await Promise.all(allPostsData.map(async (post) => {
        // コメントといいねを並列で取得
        const [cRes, lRes] = await Promise.all([
          fetch(`/api/comments?postId=${post.id}`),
          fetch(`/api/likes?postId=${post.id}`)
        ]);
        const comments = await cRes.json();
        const likesData = await lRes.json();
        
        return { ...post, comments, likes: likesData.count };
      }));
      
      // すべての投稿を時系列順で保存
      const allSorted = postsWithAll.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllPosts(allSorted);
      
      // トピック投稿と通常投稿を分別
      const topics = postsWithAll.filter(p => p.isTopicPost === 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const regular = postsWithAll.filter(p => !p.parentPostId && p.isTopicPost !== 1).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      // トピックに返信投稿を組み込む
      const topicsWithChildren = topics.map(topic => {
        const children = postsWithAll.filter(p => p.parentPostId === topic.id);
        return { ...topic, children };
      });
      
      setTopicPosts(topicsWithChildren);
      setPosts(regular);
    }
  };
  // ページを開いた時に実行する
  useEffect(() => {
    // ログイン・未ログインに関わらず投稿を取得する
    fetchPosts();
  }, []);

  // 2. 初期化時にLocalStorageから既読（いいね済み）リストを読み込む
  useEffect(() => {
    const savedLikes = localStorage.getItem("lit-club-liked-ids");
    if (savedLikes) {
      setLikedPosts(JSON.parse(savedLikes));
    }
    fetchPosts();
  }, []);

  // 3. いいね実行関数
  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isLiked = likedPosts.includes(postId);
    const userId = session?.user?.email || "guest";

    // メソッドを切り替える (あればDELETE、なければPOST)
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
          // 解除：リストから取り除く
          newLikedPosts = likedPosts.filter(id => id !== postId);
        } else {
          // 登録：リストに加える
          newLikedPosts = [...likedPosts, postId];
        }

        setLikedPosts(newLikedPosts);
        localStorage.setItem("lit-club-liked-ids", JSON.stringify(newLikedPosts));
        fetchPosts(); // 数値を再取得して反映
      }
    } catch (error) {
      console.error("操作に失敗しました", error);
    }
  };

  // 1. コメント入力用のStateを投稿IDごとに管理
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  // 2. コメント保存関数
  const saveComment = async (postId: string) => {
    const text = commentTexts[postId];
    if (!text) return;

    try {
      // ※API側でコメントを受け取れるようにする必要があります（後述）
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId,
          text: text,
          author: session?.user?.name || "匿名部員", // ログインしてなければ「匿名部員」
        }),
      });

      if (response.ok) {
        setCommentTexts({ ...commentTexts, [postId]: "" });
        alert("感想を送信しました！");
        fetchPosts(); // コメント反映のために再取得
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 削除関数
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

  // お題内で返信を投稿
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
        author: session?.user?.name || "匿名部員",
        tag: "創作",
        parentPostId: topicId,
        isTopicPost: 0,
      };

      console.log("返信データ:", postData); // デバッグ用

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
    
    // ファイル名（拡張子抜き）をタイトルに自動セットする
    const fileName = file.name.replace(/\.[^/.]+$/, "");

    try {
      if (file.type === "text/plain") {
        const text = await file.text();
        setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
      } else if (file.type === "application/pdf") {
        // PDF parsing - dynamic import
        const PDFJS = await import("pdfjs-dist");
        // workerの設定(CDN経由)
        PDFJS.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${PDFJS.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = PDFJS.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // textContext.item の各要素から文字列を結合
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          text += pageText + "\n";
        }
        
        setNewPost((prev) => ({ ...prev, title: fileName, body: text }));
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
        // DOCX parsing
        const arrayBuffer = await file.arrayBuffer();
        const JSZip = (await import("jszip")).default;
        
        // docxファイルを読み込む
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(arrayBuffer);
        const xml = await loadedZip.file("word/document.xml")?.async("text");
        
        if (xml) {
          // XMLからテキストを抽出
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
        author: session?.user?.name || "匿名部員",
      };

      // 投稿モードに応じて設定
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

      console.log("投稿データ:", postData); // デバッグ用

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      console.log("レスポンスステータス:", response.status, response.statusText);

      if (response.ok) {
        const mode = effectiveMode === "topic" ? "お題を作成しました！" : 
                     effectiveMode === "reply" ? "返信を投稿しました！" : "保存しました！";
        alert(mode);
        setNewPost({ title: "", body: "", tag: "創作" });
        setPostingMode("regular");
        setSelectedTopicId(null);
        fetchPosts(); // リストを更新
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


  // 1. ロード中
  if (status === "loading") return <div className="p-10 text-center text-slate-500">読み込み中...</div>;

  // 2. 未ログイン（紹介画面）
  return (
    <main className="min-h-screen bg-white text-slate-900 max-w-2xl mx-auto border-x border-slate-200 shadow-sm pb-40">
      {/* ヘッダー */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 p-4 z-30">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-slate-900">文芸部ポータル</h1>
            
            {session ? (
              /* ログイン済み：設定へのリンク */
              <Link href="/settings" className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-slate-100">
                <img src={session.user?.image || ""} alt="" className="object-cover" />
              </Link>
            ) : (
              /* 未ログイン：ログインボタンを表示 */
              <button 
                onClick={() => signIn("google")}
                className="text-xs bg-blue-600 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-700 transition"
              >
                ログイン
              </button>
            )}
          </div>
        </header>

      {/* タブナビゲーション */}
      <div className="sticky top-[73px] bg-white border-b border-slate-200 z-20">
        <div className="flex">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              activeTab === "all"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            📚 すべて
          </button>
          <button
            onClick={() => setActiveTab("topics")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              activeTab === "topics"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            📌 お題
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "all" ? (
        /* すべてタブ：全投稿を時系列表示 */
        <div className="divide-y divide-slate-200">
          {allPosts.map((post) => (
            <article 
              key={post.id} 
              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors" 
              onClick={() => setOpenPostId(openPostId === post.id ? null : post.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{post.author}</span>
                  {post.isTopicPost === 1 ? (
                    <span className="text-[10px] bg-purple-200 px-2 py-0.5 rounded text-purple-700 font-bold uppercase tracking-wider">お題</span>
                  ) : post.parentPostId ? (
                    <span className="text-[10px] bg-green-200 px-2 py-0.5 rounded text-green-700 font-bold uppercase tracking-wider">返信</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">{post.tag}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleLike(post.id, e)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300 ${
                      likedPosts.includes(post.id) 
                        ? "text-pink-500 bg-pink-50" 
                        : "text-slate-400 hover:text-pink-400 hover:bg-slate-100"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={likedPosts.includes(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                    </svg>
                    <span className="text-xs font-black">{post.likes || 0}</span>
                  </button>
                  <div className="flex items-center gap-1 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9A9 9 0 1 1 5.9 5.9l1.1 1.1"/></svg>
                    <span className="text-xs font-bold">{post.comments?.length || 0}</span>
                  </div>
                </div>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">{post.title}</h2>
              {openPostId === post.id ? (
                <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="flex justify-between items-start">
                    <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-medium text-sm sm:text-base flex-1">
                      {post.body}
                    </p>
                    {session?.user?.name === post.author && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePost(post.id);
                        }}
                        className="ml-3 text-red-400 hover:text-red-600 transition-colors"
                        title="削除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-xs font-medium">クリックして内容を読む...</p>
              )}
            </article>
          ))}
          {allPosts.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-slate-400 text-sm mb-2">📚</p>
              <p className="text-slate-500 text-sm font-medium">まだ投稿がありません</p>
              <p className="text-slate-400 text-xs mt-1">右下の+ボタンから最初の作品を投稿しましょう！</p>
            </div>
          )}
        </div>
      ) : (
        /* お題タブ：お題専用ビュー */
        <>
      {/* お題スレッド */}
      {topicPosts.length > 0 ? (
        <div className="border-b-4 border-purple-200 bg-purple-50">
          <div className="p-4 bg-purple-100 border-b border-purple-200">
            <h2 className="text-sm font-black text-purple-900 uppercase tracking-widest">📌 毎週のお題</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {topicPosts.map((topic) => (
              <div key={topic.id}>
                {/* お題投稿 */}
                <article 
                  className="p-4 hover:bg-purple-100 cursor-pointer transition-colors bg-white" 
                  onClick={() => router.push(`/topic/${topic.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-900">{topic.author}</span>
                      <span className="text-[10px] bg-purple-200 px-2 py-0.5 rounded text-purple-700 font-bold uppercase tracking-wider">お題</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(topic.id, e);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300 ${
                          likedPosts.includes(topic.id) 
                            ? "text-pink-500 bg-pink-50" 
                            : "text-slate-400 hover:text-pink-400 hover:bg-slate-100"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={likedPosts.includes(topic.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                        </svg>
                        <span className="text-xs font-black">{topic.likes || 0}</span>
                      </button>
                      <div className="flex items-center gap-1 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-1.9A9 9 0 1 1 5.9 5.9l1.1 1.1"/></svg>
                        <span className="text-xs font-bold">{(topic.children?.length || 0) + (topic.comments?.length || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-purple-900 mb-1">{topic.title}</h2>
                  <p className="text-slate-600 text-sm line-clamp-2">{topic.body}</p>
                  <p className="text-slate-400 text-xs font-medium mt-2">クリックして詳細ページを表示...</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center">
          <p className="text-slate-400 text-sm mb-2">📌</p>
          <p className="text-slate-500 text-sm font-medium">まだお題がありません</p>
          <p className="text-slate-400 text-xs mt-1">右下の+ボタンから最初のお題を作成しましょう！</p>
        </div>
      )}
        </>
      )}

      {/* 投稿エリア（ログイン時のみ） */}
      {/* 右下の投稿ボタン (FAB) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
        {/* 投稿フォーム本体（開いている時だけ表示） */}
        {isFormOpen && session && (
          <div className="mb-2 w-72 sm:w-80 bg-white border border-slate-200 p-5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-black text-slate-700 uppercase">
                {activeTab === "topics" ? "📌 お題を作成" : "💾 作品を投稿"}
              </p>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {activeTab === "topics" ? (
              /* お題作成用のテキスト入力フォーム */
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="お題のタイトル（例：【3月15日まで】夏祭り）"
                  value={newPost.title || ""}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full text-sm border border-purple-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <textarea
                  placeholder="お題の説明を入力..."
                  value={newPost.body || ""}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  rows={4}
                  className="w-full text-sm border border-purple-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
                {newPost.title && newPost.body && (
                  <button 
                    onClick={async () => {
                      await saveToAWS("topic");
                      setIsFormOpen(false);
                    }} 
                    className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 shadow-md shadow-purple-200 transition-all"
                  >
                    お題を公開
                  </button>
                )}
              </div>
            ) : (
              /* 作品投稿用のファイルアップロードフォーム */
              <>
                <input 
                  type="file" 
                  accept=".txt,.pdf,.docx" 
                  onChange={handleFileChange} 
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
                
                {newPost.title && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Ready to Upload</p>
                    <p className="text-sm font-bold text-blue-900 truncate mb-3">{newPost.title}</p>
                    <button 
                      onClick={async () => {
                        await saveToAWS("regular");
                        setIsFormOpen(false);
                      }} 
                      className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
                    >
                      保存を実行
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 丸いメインボタン */}
        <button
          onClick={() => {
            if (session) {
              setIsFormOpen(!isFormOpen);
            } else {
              signIn("google");
            }
          }}
          className={`${
            session ? "bg-blue-600 shadow-blue-200" : "bg-slate-900 shadow-slate-200"
          } h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 group`}
        >
          {isFormOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              {!session && <span className="absolute -top-10 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">ログインして投稿</span>}
            </div>
          )}
        </button>
      </div>
    </main>
  );
}

