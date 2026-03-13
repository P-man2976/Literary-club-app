"use client";

interface EditPostFormProps {
  postId: string;
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSave: (postId: string) => void;
  onCancel: () => void;
}

export function EditPostForm({
  postId,
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSave,
  onCancel,
}: EditPostFormProps) {
  return (
    <div className="bg-white chrome:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border-l-4 border-blue-500 chrome:border-blue-400">
      <h3 className="text-lg font-bold mb-4">投稿を編集</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full px-4 py-2 border border-default-300 chrome:border-default-600 bg-default-50 chrome:bg-default-800 text-default-900 chrome:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">内容</label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="w-full px-4 py-2 border border-default-300 chrome:border-default-600 bg-default-50 chrome:bg-default-800 text-default-900 chrome:text-slate-100 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[200px]"
          />
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => onSave(postId)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
          >
            保存
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-default-300 chrome:bg-default-700 text-default-700 chrome:text-slate-200 rounded-lg font-semibold hover:bg-default-400 chrome:hover:bg-default-600"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
