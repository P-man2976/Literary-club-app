"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { HandDrawnPostIcon } from "@/app/components/HandDrawnIcons";
import { usePosts } from "@/app/hooks/usePosts";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useCreatePost } from "@/app/hooks/useCreatePost";
import { parseFile } from "@/app/lib/fileParser";
import type { Post } from "@/app/types/post";

type PostCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PostCreateModal({ isOpen, onClose }: PostCreateModalProps) {
  const { data: session } = useSession();
  const { penName } = useUserProfile(session ?? null);
  const { topicPosts } = usePosts();
  const { trigger, isMutating } = useCreatePost();

  const [newPost, setNewPost] = useState<Partial<Post>>({ title: "", body: "", tag: "創作" });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setNewPost({ title: "", body: "", tag: "創作" });
    setSelectedTopicId(null);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseFile(file);
      setNewPost((prev) => ({ ...prev, title: result.title, body: result.body }));
    } catch (error) {
      console.error("ファイル解析エラー:", error);
      alert("ファイルの解析に失敗しました");
    }
  };

  const handleSubmit = () => {
    if (!newPost.title || !newPost.body) {
      alert("タイトルと本文は必須です");
      return;
    }
    trigger(
      {
        title: newPost.title,
        body: newPost.body,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
        tag: selectedTopicId ? "作品" : "創作",
        parentPostId: selectedTopicId || null,
      },
      {
        throwOnError: false,
        onSuccess: () => {
          alert("投稿しました！");
          setNewPost({ title: "", body: "", tag: "創作" });
          setSelectedTopicId(null);
          onClose();
        },
        onError: () => {
          alert("投稿に失敗しました");
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl border-4 border-white shadow-street-hard-lg-hover max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center border-b-4 border-black p-6 bg-linear-to-r from-purple-300 to-pink-400">
          <h2 className="text-2xl font-black uppercase flex items-center gap-2">
            <HandDrawnPostIcon size={24} />
            投稿を作成
          </h2>
          <button
            onClick={handleClose}
            className="text-2xl text-gray-500 hover:text-gray-700 chrome:text-gray-400 chrome:hover:text-gray-200"
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
              className="w-full border border-gray-300 chrome:border-slate-600 rounded-lg px-3 py-2 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100"
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
            <p className="text-xs text-gray-500 chrome:text-gray-400 mt-2">対応形式: テキスト (.txt), PDF, Word (.docx)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">タイトル</label>
            <input
              type="text"
              placeholder="投稿のタイトル"
              value={newPost.title || ""}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="w-full border border-gray-300 chrome:border-slate-600 rounded-lg px-3 py-2 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">本文</label>
            <textarea
              placeholder="投稿の内容を入力..."
              value={newPost.body || ""}
              onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
              rows={8}
              className="w-full border border-gray-300 chrome:border-slate-600 rounded-lg px-3 py-2 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 border-t-4 border-black p-6 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-black font-black uppercase bg-gray-300 border-3 border-black rounded-lg shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!newPost.title || !newPost.body || isMutating}
            className="px-6 py-3 bg-yellow-400 text-black rounded-lg font-black uppercase border-3 border-white shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isMutating ? "投稿中..." : "投稿"}
          </button>
        </div>
      </div>
    </div>
  );
}
