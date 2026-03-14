"use client";

import { useState } from "react";
import { Textarea } from "@/app/components/ui/Input";

interface CommentInputProps {
  theme?: "street" | "chrome" | "library";
  onSubmit: (text: string) => void;
}

export function CommentInput({ theme, onSubmit }: CommentInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    onSubmit(text);
    setText("");
  };

  return (
    <div className="pt-4 border-t-4 border-black chrome:border-green-600">
      <div className="flex gap-2">
        <Textarea
          placeholder="コメントを入力..."
          value={text}
          onValueChange={setText}
          theme={theme}
          rows={2}
          className="flex-1"
        />
        <button
          onClick={handleSubmit}
          disabled={!text}
          className="px-4 py-2 bg-cyan-400 text-black rounded-lg font-black uppercase text-sm border-3 border-black shadow-street-hard hover:-translate-y-0.5 hover:shadow-street-hard-hover disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        >
          送信
        </button>
      </div>
    </div>
  );
}
