"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Input, Textarea } from "@/app/components/ui/Input";

interface EditPostFormProps {
  postId: string;
  initialTitle: string;
  initialBody: string;
  theme?: "street" | "chrome" | "library";
  onSave: (postId: string, title: string, body: string) => void;
  onCancel: () => void;
}

export function EditPostForm({
  postId,
  initialTitle,
  initialBody,
  theme,
  onSave,
  onCancel,
}: EditPostFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  return (
    <div className="bg-white chrome:bg-slate-900 rounded-2xl shadow-md p-6 mb-8 border-l-4 border-blue-500 chrome:border-blue-400">
      <h3 className="text-lg font-bold mb-4">投稿を編集</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">タイトル</label>
          <Input
            type="text"
            value={title}
            onValueChange={setTitle}
            theme={theme}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">内容</label>
          <Textarea
            value={body}
            onValueChange={setBody}
            theme={theme}
            className="min-h-50"
          />
        </div>
        <div className="flex gap-4">
          <Button
            color="primary"
            theme={theme}
            onClick={() => onSave(postId, title, body)}
          >
            保存
          </Button>
          <Button
            variant="flat"
            theme={theme}
            onClick={onCancel}
          >
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  );
}
