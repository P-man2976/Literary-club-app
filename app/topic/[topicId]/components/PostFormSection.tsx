"use client";

import type { Post } from "@/app/types/post";
import { FileCheck2, PenLine, Send, TriangleAlert } from "lucide-react";

interface PostFormSectionProps {
  appTheme: "street" | "chrome" | "library";
  sectionClassName: string;
  titleClassName: string;
  isDeadlineExpired: boolean;
  newPost: Partial<Post>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagChange: (tag: string) => void;
  onSubmit: () => void;
}

export function PostFormSection({
  appTheme,
  sectionClassName,
  titleClassName,
  isDeadlineExpired,
  newPost,
  onFileChange,
  onTagChange,
  onSubmit,
}: PostFormSectionProps) {
  return (
    <div className={sectionClassName}>
      <h3 className={titleClassName}>
        <PenLine size={18} />
        このお題に投稿する
      </h3>

      {isDeadlineExpired ? (
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
              onChange={onFileChange}
              className="w-full px-4 py-2 border border-gray-300 chrome:border-slate-700 bg-white chrome:bg-slate-800 text-slate-900 chrome:text-slate-100 rounded-sm cursor-pointer"
            />
            <p className="text-xs text-gray-500 chrome:text-slate-200 mt-2">
              対応形式: テキスト (.txt), PDF, Word (.docx)
            </p>
            <p className="text-xs text-gray-400 chrome:text-slate-300 mt-1">
              ファイルのタイトルと内容から自動で投稿が作成されます
            </p>
          </div>

          {newPost.title && (
            <>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-500 font-bold mb-2 flex items-center gap-1">
                  <FileCheck2 size={14} />
                  ファイル解析済み
                </p>
                <p className="text-sm font-bold text-blue-900 truncate">
                  {newPost.title}
                </p>
                <p className="text-xs text-blue-700 mt-2 line-clamp-3">
                  {newPost.body}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">タグ</label>
                <select
                  value={newPost.tag || "創作"}
                  onChange={(e) => onTagChange(e.target.value)}
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
                onClick={onSubmit}
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
  );
}
