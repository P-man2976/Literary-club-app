"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, Input, Avatar } from "@heroui/react";
import { getUserIconUrl } from "@/app/lib/imageUtils";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [penName, setPenName] = useState("");
  const [isEditingPenName, setIsEditingPenName] = useState(false);
  const [pendingPenName, setPendingPenName] = useState("");
  const [loadingPenName, setLoadingPenName] = useState(true);
  const [selfIntro, setSelfIntro] = useState("");
  const [pendingSelfIntro, setPendingSelfIntro] = useState("");
  const [isEditingSelfIntro, setIsEditingSelfIntro] = useState(false);
  const [loadingSelfIntro, setLoadingSelfIntro] = useState(true);
  const [userIcon, setUserIcon] = useState<string | null>(null);
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [loadingIcon, setLoadingIcon] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notificationSupported, setNotificationSupported] = useState(false);

  // Hydration対策
  useEffect(() => {
    setMounted(true);
    
    // 通知サポートチェック
    if ("Notification" in window && "serviceWorker" in navigator) {
      setNotificationSupported(true);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // プロフィール情報取得（ペンネーム + アイコン）
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setPenName(data.penName || "");
          setUserIcon(data.userIcon || null);
          setSelfIntro(data.selfIntro || "");
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      } finally {
        setLoadingPenName(false);
        setLoadingSelfIntro(false);
        setLoadingIcon(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  // ペンネーム保存
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

      if (res.ok) {
        const data = await res.json();
        setPenName(data.penName);
        setIsEditingPenName(false);
        alert("ペンネームを保存しました！");
      } else {
        const error = await res.json();
        alert(error.error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("ペンネーム保存エラー:", error);
      alert("保存に失敗しました");
    }
  };

  const saveSelfIntro = async () => {
    if (pendingSelfIntro.trim().length > 20) {
      alert("自己紹介は20文字以内にしてください");
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfIntro: pendingSelfIntro.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelfIntro(data.selfIntro || "");
        setIsEditingSelfIntro(false);
        alert("自己紹介を保存しました！");
      } else {
        const error = await res.json();
        alert(error.error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("自己紹介保存エラー:", error);
      alert("保存に失敗しました");
    }
  };

  // アイコン画像ハンドラー
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
      if (res.ok) {
        setUserIcon(data.userIcon);
        setIsEditingIcon(false);
        alert("アイコンを保存しました！");
      } else {
        alert(data.error || "保存に失敗しました");
      }
    } catch (error) {
      console.error("アイコン保存エラー:", error);
      alert("保存に失敗しました");
    } finally {
      setUploadingIcon(false);
    }
  };

  // プッシュ通知を有効化
  const enableNotifications = async () => {
    if (!notificationSupported) {
      alert("お使いのブラウザは通知に対応していません");
      return;
    }

    try {
      // 通知許可をリクエスト
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        alert("通知が許可されませんでした");
        return;
      }

      // Service Worker登録を確認
      const registration = await navigator.serviceWorker.ready;

      // プッシュ通知のサブスクリプションを作成
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
      });

      // サブスクリプションをサーバーに保存
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
            auth: arrayBufferToBase64(subscription.getKey("auth")),
          },
        }),
      });

      if (response.ok) {
        alert("通知を有効にしました！");
      } else {
        alert("サブスクリプションの保存に失敗しました");
      }
    } catch (error) {
      console.error("通知有効化エラー:", error);
      alert("通知の有効化に失敗しました");
    }
  };

  // ArrayBufferをBase64に変換
  const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
    if (!buffer) return "";
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  if (!session) return <div className="p-10 text-center">ログインが必要です</div>;

  return (
    <main className="min-h-screen max-w-2xl mx-auto">
      {/* ヘッダー: 戻るボタン付き */}
      <header className="sticky top-0 z-30 bg-background border-b border-divider p-4 flex items-center gap-4">
        <Button
          as={Link}
          href="/"
          isIconOnly
          variant="light"
          aria-label="戻る"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Button>
        <h1 className="text-xl font-bold">設定</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* プロフィール設定セクション */}
        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-4">プロフィール</h2>
          <Card>
            <CardBody className="gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-default-500 font-bold">Google名 / Google アイコン</p>
                  <p className="font-medium">{session.user?.name}</p>
                </div>
                <Avatar src={session.user?.image || ""} size="lg" />
              </div>
              
              {/* カスタムアイコン設定 */}
              <div className="border-t border-divider pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-default-500 font-bold">カスタムアイコン</p>
                  {!isEditingIcon && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="light"
                      onPress={() => setIsEditingIcon(true)}
                    >
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
                      className="block w-full text-sm text-default-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        hover:file:bg-primary-100"
                    />
                    <p className="text-xs text-default-400">推奨: 正方形、500KB以下</p>
                    <Button
                      variant="flat"
                      onPress={() => setIsEditingIcon(false)}
                      className="w-full"
                      isDisabled={uploadingIcon}
                    >
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
                      <div className="w-16 h-16 min-w-16 min-h-16 rounded-full bg-default-200 flex items-center justify-center shrink-0">
                        <span className="text-sm text-default-400">未設定</span>
                      </div>
                    )}
                    <p className="text-sm text-default-600">
                      {loadingIcon ? "読み込み中..." : (userIcon ? "カスタムアイコン設定済み" : "アイコンはまだ設定されていません")}
                    </p>
                  </div>
                )}
              </div>

              {/* ペンネーム設定 */}
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
                    <Input
                      value={pendingPenName}
                      onValueChange={setPendingPenName}
                      placeholder="ペンネームを入力..."
                      maxLength={20}
                      size="sm"
                    />
                    <p className="text-xs text-default-400 text-right">{pendingPenName.length}/20</p>
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        onPress={savePenName}
                        className="flex-1"
                      >
                        保存
                      </Button>
                      <Button
                        variant="flat"
                        onPress={() => setIsEditingPenName(false)}
                        className="flex-1"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium">
                    {loadingPenName ? "読み込み中..." : (penName || "未設定")}
                  </p>
                )}
              </div>

              {/* 自己紹介設定 */}
              <div className="border-t border-divider pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-default-500 font-bold">自己紹介（20文字まで）</p>
                  {!isEditingSelfIntro && (
                    <Button
                      size="sm"
                      color="primary"
                      variant="light"
                      onPress={() => {
                        setPendingSelfIntro(selfIntro);
                        setIsEditingSelfIntro(true);
                      }}
                    >
                      {selfIntro ? "変更" : "設定"}
                    </Button>
                  )}
                </div>

                {isEditingSelfIntro ? (
                  <div className="space-y-3">
                    <Input
                      value={pendingSelfIntro}
                      onValueChange={setPendingSelfIntro}
                      placeholder="例: 短歌とSFが好き"
                      maxLength={20}
                      size="sm"
                    />
                    <p className="text-xs text-default-400 text-right">{pendingSelfIntro.length}/20</p>
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        onPress={saveSelfIntro}
                        className="flex-1"
                      >
                        保存
                      </Button>
                      <Button
                        variant="flat"
                        onPress={() => setIsEditingSelfIntro(false)}
                        className="flex-1"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-sm text-default-700">
                    {loadingSelfIntro ? "読み込み中..." : (selfIntro || "未設定")}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </section>

        {/* テーマ設定セクション */}
        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-4">テーマ</h2>
          <Card>
            <CardBody className="gap-0 p-0">
              {mounted && (
                <>
                  <Button
                    onPress={() => setTheme("light")}
                    variant="light"
                    className={`w-full justify-start px-4 py-6 rounded-none ${
                      theme === "light" ? "bg-primary-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                      </svg>
                      <div className="flex-1 text-left">
                        <p className={`font-bold ${theme === "light" ? "text-primary" : ""}`}>ライト</p>
                        <p className="text-xs text-default-500">明るいテーマ</p>
                      </div>
                      {theme === "light" && <span className="text-primary">✓</span>}
                    </div>
                  </Button>
                  <div className="border-t border-divider" />
                  <Button
                    onPress={() => setTheme("dark")}
                    variant="light"
                    className={`w-full justify-start px-4 py-6 rounded-none ${
                      theme === "dark" ? "bg-primary-50 dark:bg-primary-900/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                      <div className="flex-1 text-left">
                        <p className={`font-bold ${theme === "dark" ? "text-primary" : ""}`}>ダーク</p>
                        <p className="text-xs text-default-500">暗いテーマ</p>
                      </div>
                      {theme === "dark" && <span className="text-primary">✓</span>}
                    </div>
                  </Button>
                  <div className="border-t border-divider" />
                  <Button
                    onPress={() => setTheme("system")}
                    variant="light"
                    className={`w-full justify-start px-4 py-6 rounded-none ${
                      theme === "system" ? "bg-primary-50 dark:bg-primary-900/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-default-500">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="2" y1="20" x2="22" y2="20"/>
                      </svg>
                      <div className="flex-1 text-left">
                        <p className={`font-bold ${theme === "system" ? "text-primary" : ""}`}>端末の設定に合わせる</p>
                        <p className="text-xs text-default-500">システムのテーマに従う</p>
                      </div>
                      {theme === "system" && <span className="text-primary">✓</span>}
                    </div>
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </section>

        {/* 通知設定セクション */}
        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-4">通知</h2>
          <Card>
            <CardBody className="gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">プッシュ通知</p>
                  <p className="text-xs text-default-500">締め切りリマインダーを受け取る</p>
                </div>
                <div className="flex items-center gap-2">
                  {notificationPermission === "granted" ? (
                    <span className="text-xs px-2 py-1 bg-success-100 text-success-700 rounded-full font-semibold">
                      有効
                    </span>
                  ) : notificationPermission === "denied" ? (
                    <span className="text-xs px-2 py-1 bg-danger-100 text-danger-700 rounded-full font-semibold">
                      無効
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-default-100 text-default-600 rounded-full font-semibold">
                      未設定
                    </span>
                  )}
                </div>
              </div>
              
              {notificationSupported ? (
                <>
                  {notificationPermission === "granted" ? (
                    <div className="bg-success-50 border border-success-200 rounded-lg p-3">
                      <p className="text-xs text-success-700">
                        ✓ 通知が有効です。お題の締め切り24時間前と当日に通知を受け取ります。
                      </p>
                    </div>
                  ) : notificationPermission === "denied" ? (
                    <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                      <p className="text-xs text-danger-700">
                        ⚠️ 通知がブロックされています。ブラウザの設定から許可してください。
                      </p>
                    </div>
                  ) : (
                    <Button
                      color="primary"
                      onPress={enableNotifications}
                      className="w-full"
                    >
                      通知を有効にする
                    </Button>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs text-default-500 font-semibold">通知タイミング:</p>
                    <ul className="text-xs text-default-400 space-y-1 pl-4">
                      <li>• 締め切りの24時間前</li>
                      <li>• 締め切り当日</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <p className="text-xs text-warning-700">
                    お使いのブラウザまたはデバイスは通知に対応していません。
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </section>

        {/* コンテンツ管理セクション */}
        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-4">コンテンツ管理</h2>
          <Card isPressable onPress={() => router.push("/settings/my-content")}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">自分の投稿一覧</p>
                  <p className="text-xs text-default-500">削除・閲覧数の確認</p>
                </div>
                <span className="text-default-400">→</span>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* アカウント操作 */}
        <section>
          <Button
            color="danger"
            variant="flat"
            onPress={() => signOut({ callbackUrl: "/" })}
            className="w-full"
          >
            ログアウト
          </Button>
        </section>
      </div>
    </main>
  );
}