"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Button, Card, CardBody, Input } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import { getUserIconUrl } from "@/app/lib/imageUtils";

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [penName, setPenName] = useState("");
  const [pendingPenName, setPendingPenName] = useState("");
  const [isEditingPenName, setIsEditingPenName] = useState(false);
  const [loadingPenName, setLoadingPenName] = useState(true);
  const [userIcon, setUserIcon] = useState<string | null>(null);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        setPenName(data.penName || "");
        setUserIcon(data.userIcon || null);
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      } finally {
        setLoadingPenName(false);
      }
    };

    if (session) fetchProfile();
  }, [session]);

  const savePenName = async () => {
    if (!pendingPenName.trim()) {
      alert("ペンネームを入力してください");
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ penName: pendingPenName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "保存に失敗しました");
        return;
      }

      const data = await res.json();
      setPenName(data.penName || "");
      setIsEditingPenName(false);
      alert("ペンネームを保存しました");
    } catch (error) {
      console.error("ペンネーム保存エラー:", error);
      alert("保存に失敗しました");
    }
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    if (file.size > 1000000) {
      alert("画像は1MB以下にしてください");
      return;
    }

    try {
      setUploadingIcon(true);

      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadRes = await fetch("/api/images/upload", {
        method: "POST",
        body: uploadForm,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        alert(uploadData.error || "画像アップロードに失敗しました");
        return;
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIcon: uploadData.imageUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "保存に失敗しました");
        return;
      }

      setUserIcon(data.userIcon || null);
      setIsEditingIcon(false);
      alert("アイコンを保存しました");
    } catch (error) {
      console.error("アイコン保存エラー:", error);
      alert("保存に失敗しました");
    } finally {
      setUploadingIcon(false);
    }
  };

  if (!session) return <div className="p-10 text-center">ログインが必要です</div>;

  return (
    <main className="min-h-screen max-w-3xl mx-auto">
      <header className="sticky top-0 z-30 bg-background border-b border-divider p-4 flex items-center gap-4">
        <Button as={Link} href="/" isIconOnly variant="light" aria-label="戻る">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Button>
        <h1 className="text-xl font-bold">アカウント設定</h1>
      </header>

      <div className="p-5 space-y-6">
        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-3">アカウント</h2>
          <Card className="rounded-2xl">
            <CardBody className="gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-default-500 font-bold">アカウント名</p>
                  <p className="font-medium">{session.user?.name || "未設定"}</p>
                </div>
                <Avatar src={session.user?.image || ""} size="lg" />
              </div>

              <div className="border-t border-divider pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-default-500 font-bold">カスタムアイコン</p>
                  {!isEditingIcon && (
                    <Button size="sm" color="primary" variant="light" onPress={() => setIsEditingIcon(true)}>
                      {userIcon ? "変更" : "アップロード"}
                    </Button>
                  )}
                </div>

                {isEditingIcon ? (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconFileChange}
                      disabled={uploadingIcon}
                      className="block w-full text-sm text-default-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <Button variant="flat" onPress={() => setIsEditingIcon(false)} className="w-full" isDisabled={uploadingIcon}>
                      キャンセル
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {userIcon ? (
                      <img
                        src={getUserIconUrl(session?.user?.email, userIcon) || userIcon}
                        alt="カスタムアイコン"
                        className="w-16 h-16 min-w-16 min-h-16 rounded-full object-cover border-2 border-primary shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 min-w-16 min-h-16 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-sm text-default-400">未設定</span>
                      </div>
                    )}
                    <p className="text-sm text-default-600">{userIcon ? "カスタムアイコン設定済み" : "アイコンはまだ設定されていません"}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-divider pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-default-500 font-bold">ペンネーム</p>
                  {!isEditingPenName && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="light"
                      onPress={() => {
                        setPendingPenName(penName);
                        setIsEditingPenName(true);
                      }}
                    >
                      {penName ? "変更" : "設定"}
                    </Button>
                  )}
                </div>
                {isEditingPenName ? (
                  <div className="space-y-3">
                    <Input value={pendingPenName} onValueChange={setPendingPenName} placeholder="ペンネームを入力..." maxLength={20} size="sm" />
                    <p className="text-xs text-default-400 text-right">{pendingPenName.length}/20</p>
                    <div className="flex gap-2">
                      <Button color="primary" onPress={savePenName} className="flex-1">保存</Button>
                      <Button variant="flat" onPress={() => setIsEditingPenName(false)} className="flex-1">キャンセル</Button>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium">{loadingPenName ? "読み込み中..." : (penName || "未設定")}</p>
                )}
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-3">コンテンツ管理</h2>
          <Card className="rounded-2xl" isPressable onPress={() => router.push("/settings/my-content")}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">自分の投稿一覧</p>
                  <p className="text-xs text-default-500">削除・閲覧数の確認</p>
                </div>
                <ChevronRight size={18} className="text-default-400" />
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <Button color="danger" variant="flat" onPress={() => signOut({ callbackUrl: "/" })} className="w-full">
            ログアウト
          </Button>
        </section>
      </div>
    </main>
  );
}
