"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lightbulb } from "lucide-react";
import { useUserProfile } from "@/app/hooks/useUserProfile";
import { useCreatePost } from "@/app/hooks/useCreatePost";

type ProposalModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProposalModal({ isOpen, onClose }: ProposalModalProps) {
  const { data: session } = useSession();
  const { penName } = useUserProfile(session ?? null);
  const { trigger, isMutating } = useCreatePost();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    setTitle("");
    setBody("");
    onClose();
  };

  const handleSubmit = () => {
    if (!title || !body) {
      alert("タイトルと内容は必須です");
      return;
    }
    trigger(
      {
        title,
        body,
        author: penName || session?.user?.name || "匿名部員",
        authorEmail: session?.user?.email || null,
        tag: "お題案",
      },
      {
        throwOnError: false,
        onSuccess: () => {
          alert("お題案を投稿しました！");
          setTitle("");
          setBody("");
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
        className="bg-white rounded-2xl border-4 border-white shadow-[0_10px_0_rgba(0,0,0,0.9)] max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center border-b-4 border-black p-6 bg-linear-to-r from-yellow-300 to-orange-400">
          <h2 className="text-2xl font-black uppercase flex items-center gap-2">
            <Lightbulb size={24} strokeWidth={3} />
            お題案を投稿
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
            <label className="block text-sm font-semibold mb-2">お題案タイトル</label>
            <input
              type="text"
              placeholder="例：夏祭りの思い出"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 chrome:border-slate-600 rounded-lg px-3 py-2 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">詳細・説明</label>
            <textarea
              placeholder="お題案の詳細や説明を入力..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 chrome:border-slate-600 rounded-lg px-3 py-2 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 border-t-4 border-black p-6 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-black font-black uppercase bg-gray-300 border-3 border-black rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || !body || isMutating}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-black uppercase border-3 border-white shadow-[0_4px_0_rgba(0,0,0,0.8)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.8)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isMutating ? "投稿中..." : "投稿"}
          </button>
        </div>
      </div>
    </div>
  );
}
