"use client";

import { useSession, signOut } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
};

export default function TopicPage() {
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

  // トピック詳細と返信を取得
  const fetchTopicAndReplies = async () => {
    try {
      const res = await fetch("/api/posts");
      const allPosts: any[] = await res.json();

      // トピックを取得
      const topicData = allPosts.find(p => p.id === topicId);
      
      // 返信を取得
      const repliesData = allPosts.filter(p => p.parentPostId === topicId);
      
      if (topicData) {
        // コメントといいねを並列で取得
        const [cRes, lRes] = await Promise.all([
          fetch(`/api/comments?postId=${topicData.id}`),
          fetch(`/api/likes?postId=${topicData.id}`)
        ]);
        const comments = await cRes.json();
        const likesData = await lRes.json();
        
        setTopic({ ...topicData, comments, likes: likesData.count });
      }

      // 返信にもコメントといいねを取得
      const repliesWithDetails = await Promise.all(repliesData.map(async (reply) => {
        const [cRes, lRes] = await Promise.all([
          fetch(`/api/comments?postId=${reply.id}`),
          fetch(`/api/likes?postId=${reply.id}`)
        ]);
        const comments = await cRes.json();
        const likesData = await lRes.json();
        
        return { ...reply, comments, likes: likesData.count };
      }));

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

  const saveReply = async () => {
    if (!newPost.title || !newPost.body) {
      alert("タイトルと本文を入力してください");
      return;
    }

    try {
      const postData = {
        title: newPost.title,
        body: newPost.body,
        author: session?.user?.name || "匿名部員",
        tag: newPost.tag || "創作",
        parentPostId: topicId,
        isTopicPost: 0,
      };

      console.log("📝 返信データ:", postData);

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      const text = await response.text();
      console.log("💾 レスポンス:", response.status, text);

      if (response.ok) {
        alert("投稿しました！");
        setNewPost({ title: "", body: "", tag: "創作" });
        fetchTopicAndReplies();
      } else {
        console.error("❌ エラー:", text);
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
        fetchTopicAndReplies();
      }
    } catch (error) {
      console.error("いいね操作エラー:", error);
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
        fetchTopicAndReplies();
      }
    } catch (error) {
      console.error("削除エラー:", error);
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
          author: session?.user?.name || "匿名部員",
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

  if (loading) {
    return <div className="text-center py-10">読み込み中...</div>;
  }

  if (!topic) {
    return (
      <div className="text-center py-10">
        <p>お題が見つかりませんでした</p>
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700 font-semibold"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-center flex-1">お題詳細</h1>
          <div>
            {session ? (
              <button
                onClick={() => signOut()}
                className="text-red-500 hover:text-red-700 font-semibold"
              >
                ログアウト
              </button>
            ) : null}
          </div>
        </div>

        {/* トピック表示 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500 mb-2">お題投稿</p>
          <h2 className="text-xl font-bold text-purple-600 mb-4">{topic.title}</h2>
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">{topic.body}</p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{topic.author}</span>
            <span>{new Date(topic.createdAt * 1000).toLocaleString()}</span>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => handleLike(topic.id)}
              className={`px-4 py-2 rounded font-semibold transition ${
                likedPosts.includes(topic.id)
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ❤️ {topic.likes || 0}
            </button>
            {session?.user?.email === topic.author && (
              <button
                onClick={() => deletePost(topic.id)}
                disabled={replies.length > 0}
                className={`px-4 py-2 rounded font-semibold ${
                  replies.length > 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-red-100 text-red-600 hover:bg-red-200"
                }`}
                title={replies.length > 0 ? "このお題に投稿があるため削除できません" : "削除"}
              >
                削除
              </button>
            )}
          </div>
        </div>

        {/* 投稿フォーム（ファイルインポート専用） */}
        {session && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-bold mb-4">✍️ このお題に投稿する</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">📄 ファイルを選択</label>
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">対応形式: テキスト (.txt), PDF, Word (.docx)</p>
              <p className="text-xs text-gray-400 mt-1">ファイルのタイトルと内容から自動で投稿が作成されます</p>
            </div>

            {newPost.title && (
              <>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-500 font-bold mb-2">📋 ファイル解析済み</p>
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
                  className="w-full px-4 py-3 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 transition"
                >
                  ✨ 投稿
                </button>
              </>
            )}
          </div>
        )}

        {/* 投稿一覧 */}
        <div>
          <h3 className="text-lg font-bold mb-4">このお題への投稿 ({replies.length})</h3>
          {replies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">まだ投稿がありません</p>
          ) : (
            replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-white rounded-lg shadow-md p-6 mb-4 border-l-4 border-blue-500"
              >
                {/* 投稿本体 */}
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-blue-600 mb-2">{reply.title}</h4>
                  <p className="text-gray-700 mb-4 whitespace-pre-wrap">{reply.body}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{reply.author}</span>
                    <span>{new Date(reply.createdAt * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleLike(reply.id)}
                      className={`px-4 py-2 rounded font-semibold transition ${
                        likedPosts.includes(reply.id)
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      ❤️ {reply.likes || 0}
                    </button>
                    {session?.user?.email === reply.author && (
                      <button
                        onClick={() => deletePost(reply.id)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded font-semibold hover:bg-red-200"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>

                {/* コメント一覧 */}
                {reply.comments && reply.comments.length > 0 && (
                  <div className="mb-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-400 mb-3">💬 コメント ({reply.comments.length})</p>
                    <div className="space-y-3">
                      {reply.comments.map((comment) => (
                        <div key={comment.commentId} className="bg-gray-50 p-3 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-700">{comment.author}</span>
                            <span className="text-xs text-gray-400">{new Date(comment.createdAt * 1000).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-600 mb-2">{comment.text}</p>
                          <button
                            onClick={() => toggleCommentLike(comment.commentId)}
                            className={`text-xs px-2 py-1 rounded transition ${
                              commentLikes[comment.commentId]
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            }`}
                          >
                            ❤️ {commentLikes[comment.commentId] ? 1 : 0}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* コメント入力フォーム */}
                {session && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="コメントを入力..."
                        value={commentTexts[reply.id] || ""}
                        onChange={(e) => setCommentTexts({ ...commentTexts, [reply.id]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => saveComment(reply.id)}
                        disabled={!commentTexts[reply.id]}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
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
      </div>
    </div>
  );
}
