"use client";

interface CommentInputProps {
  postId: string;
  value: string;
  onChange: (postId: string, value: string) => void;
  onSubmit: (postId: string) => void;
}

export function CommentInput({
  postId,
  value,
  onChange,
  onSubmit,
}: CommentInputProps) {
  return (
    <div className="pt-4 border-t-4 border-black chrome:border-green-600">
      <div className="flex gap-2">
        <textarea
          placeholder="コメントを入力..."
          value={value}
          onChange={(e) => onChange(postId, e.target.value)}
          className="flex-1 px-3 py-2 border-3 border-black chrome:border-green-600 bg-white chrome:bg-gray-900 chrome:text-green-200 rounded-lg text-sm font-semibold focus:outline-hidden focus:ring-4 focus:ring-cyan-400 chrome:focus:ring-green-500"
          rows={2}
        />
        <button
          onClick={() => onSubmit(postId)}
          disabled={!value}
          className="px-4 py-2 bg-cyan-400 text-black rounded-lg font-black uppercase text-sm border-3 border-black shadow-street-hard hover:translate-y-[-2px] hover:shadow-street-hard-hover disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          送信
        </button>
      </div>
    </div>
  );
}
