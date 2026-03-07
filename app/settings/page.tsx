"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button, Card, CardBody } from "@heroui/react";
import { AlertTriangle, Check, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const aiReadingSettingKey = "lit-club-ai-reading-enabled";
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [aiReadingEnabled, setAiReadingEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);

    if ("Notification" in window && "serviceWorker" in navigator) {
      setNotificationSupported(true);
      setNotificationPermission(Notification.permission);
      setNotificationEnabled(Notification.permission === "granted");
    }

    try {
      const saved = localStorage.getItem(aiReadingSettingKey);
      setAiReadingEnabled(saved !== "0");
    } catch {
      setAiReadingEnabled(true);
    }

    const fetchAiSetting = async () => {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;

        const profile = await response.json();
        const enabled = profile?.allowAiRead !== false;
        setAiReadingEnabled(enabled);
        localStorage.setItem(aiReadingSettingKey, enabled ? "1" : "0");
      } catch {
        // Keep local fallback if profile API fails.
      }
    };

    fetchAiSetting();
  }, []);

  const toggleAiReading = async () => {
    const next = !aiReadingEnabled;
    setAiReadingEnabled(next);

    try {
      localStorage.setItem(aiReadingSettingKey, next ? "1" : "0");
    } catch {
      // Ignore storage errors on restricted browsers.
    }

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowAiRead: next }),
      });

      if (!response.ok) {
        throw new Error("failed to save");
      }
    } catch {
      // Save failed: rollback UI and local cache.
      setAiReadingEnabled(!next);
      try {
        localStorage.setItem(aiReadingSettingKey, !next ? "1" : "0");
      } catch {
        // Ignore storage errors.
      }
      alert("AI講評設定の保存に失敗しました");
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  const enableNotifications = async () => {
    if (!notificationSupported) {
      alert("お使いのブラウザは通知に対応していません");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        setNotificationEnabled(false);
        alert("通知が許可されませんでした");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert("通知設定エラー: VAPID公開鍵が未設定です");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session?.user?.email,
          endpoint: subscription.endpoint,
          keys: subscriptionJson.keys,
        }),
      });

      if (!response.ok) {
        alert("サブスクリプションの保存に失敗しました");
        return;
      }

      setNotificationEnabled(true);
      alert("通知を有効にしました");
    } catch (error) {
      console.error("通知有効化エラー:", error);
      alert("通知の有効化に失敗しました");
    }
  };

  const disableNotifications = async () => {
    if (!notificationSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        await fetch(`/api/push/subscribe?userEmail=${session?.user?.email}&endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });
      }

      setNotificationEnabled(false);
      alert("通知を無効にしました");
    } catch (error) {
      console.error("通知無効化エラー:", error);
      alert("通知の無効化に失敗しました");
    }
  };

  const toggleNotifications = async () => {
    if (notificationEnabled) {
      await disableNotifications();
    } else {
      await enableNotifications();
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
        <h1 className="text-xl font-bold">設定</h1>
      </header>

      <div className="p-5 space-y-6">
        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-3">テーマ</h2>
          <Card className="rounded-2xl">
            <CardBody className="gap-0 p-0">
              {mounted && (
                <>
                  <Button
                    onPress={() => setTheme("library")}
                    variant="light"
                    className={`w-full justify-start px-4 py-6 rounded-none ${theme === "library" ? "bg-primary-50" : ""}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <p className={`font-bold ${theme === "library" ? "text-primary" : ""}`}>LIBRARY</p>
                      {theme === "library" && <Check size={16} className="text-primary" />}
                    </div>
                  </Button>
                  <div className="border-t border-divider" />
                  <Button
                    onPress={() => setTheme("dark")}
                    variant="light"
                    className={`w-full justify-start px-4 py-6 rounded-none ${theme === "dark" ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <p className={`font-bold ${theme === "dark" ? "text-primary" : ""}`}>NEON</p>
                      {theme === "dark" && <Check size={16} className="text-primary" />}
                    </div>
                  </Button>
                  <div className="border-t border-divider" />
                  <Button
                    onPress={() => setTheme("light")}
                    variant="light"
                    className={`w-full justify-start px-4 py-6 rounded-none ${theme === "light" ? "bg-primary-50" : ""}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <p className={`font-bold ${theme === "light" ? "text-primary" : ""}`}>STREET</p>
                      {theme === "light" && <Check size={16} className="text-primary" />}
                    </div>
                  </Button>
                </>
              )}
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-3">通知</h2>
          <Card className="rounded-2xl">
            <CardBody className="gap-4">
              {notificationSupported ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold">プッシュ通知</p>
                      <p className="text-xs text-default-500">いいね・コメント・締め切りのリマインダー</p>
                    </div>
                    <button
                      onClick={toggleNotifications}
                      disabled={notificationPermission === "denied"}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        notificationEnabled ? "bg-primary" : "bg-gray-300"
                      } ${notificationPermission === "denied" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          notificationEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {notificationPermission === "denied" && (
                    <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                      <p className="text-xs text-danger-700 flex items-center gap-2">
                        <AlertTriangle size={14} />
                        通知がブロックされています。ブラウザ設定から許可してください。
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <p className="text-xs text-warning-700">お使いのブラウザまたはデバイスは通知に対応していません。</p>
                </div>
              )}
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-3">AI講評</h2>
          <Card className="rounded-2xl">
            <CardBody className="gap-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold">自分の作品をAI講評に使う</p>
                  <p className="text-xs text-default-500">OFFにすると、あなたの投稿は他人のAI講評にも含まれません</p>
                </div>
                <button
                  onClick={toggleAiReading}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    aiReadingEnabled ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      aiReadingEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-600 dark:text-slate-200">
                  注意: AI講評をONにした場合、講評生成のために入力内容が外部AI APIへ送信されます。通常は学習用途で再利用されない前提ですが、最終的には利用中のAI提供元のポリシーに従います。
                </p>
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-black text-default-400 uppercase tracking-widest mb-3">プロフィール</h2>
          <Card className="w-full rounded-2xl" isPressable onPress={() => router.push("/settings/profile")}>
            <CardBody className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">プロフィール設定へ</p>
                  <p className="text-xs text-default-500">アカウント名・ペンネーム・アイコン・投稿管理</p>
                </div>
                <ChevronRight size={18} className="text-default-400" />
              </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </main>
  );
}
