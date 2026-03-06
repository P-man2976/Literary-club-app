import { NextResponse } from "next/server";
import { getD1Client } from "@/app/lib/db";

// プッシュ通知を送信（Cloudflare Workers Cronから呼ばれる想定）
export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();
    const { userEmail, title, body, url, tag } = data;

    if (!userEmail || !title) {
      return NextResponse.json(
        { error: "userEmail and title are required" },
        { status: 400 }
      );
    }

    // ユーザーの全サブスクリプションを取得
    const result = await db.execute({
      sql: `SELECT endpoint, keys FROM pushSubscriptions WHERE userEmail = ?`,
      params: [userEmail],
    });

    if (!result.success || !result.results || result.results.length === 0) {
      return NextResponse.json(
        { error: "No subscriptions found for this user" },
        { status: 404 }
      );
    }

    const subscriptions = result.results as Array<{ endpoint: string; keys: string }>;

    // 各サブスクリプションに通知を送信
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const keys = JSON.parse(sub.keys);

        // Web Push APIを使って通知を送信
        // 注: 実際の実装では web-push ライブラリを使用する必要があります
        // ここでは簡易的なフレームワークのみ示します
        const payload = JSON.stringify({
          title,
          body: body || "",
          url: url || "/",
          tag: tag || "default",
        });

        // TODO: web-push ライブラリを使った実装
        // const webpush = require('web-push');
        // await webpush.sendNotification(
        //   { endpoint: sub.endpoint, keys },
        //   payload
        // );

        console.log("Notification sent to:", sub.endpoint);
        return { success: true, endpoint: sub.endpoint };
      } catch (error) {
        console.error("Failed to send notification:", error);
        return { success: false, endpoint: sub.endpoint, error };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Sent ${successCount} of ${results.length} notifications`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 締め切りチェック用エンドポイント（Cronから定期実行）
export async function GET() {
  try {
    const db = getD1Client();
    const now = Date.now();
    const oneDayLater = now + 24 * 60 * 60 * 1000;

    // 24時間以内に締め切りが来るお題を取得
    const upcomingResult = await db.execute({
      sql: `SELECT id, title, author, authorEmail, deadline FROM posts 
            WHERE isTopicPost = 1 AND deadline IS NOT NULL 
            AND deadline > ? AND deadline <= ?`,
      params: [now, oneDayLater],
    });

    // 締め切り当日のお題を取得（同日0時～23時59分59秒）
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const todayEnd = new Date().setHours(23, 59, 59, 999);

    const todayResult = await db.execute({
      sql: `SELECT id, title, author, authorEmail, deadline FROM posts 
            WHERE isTopicPost = 1 AND deadline IS NOT NULL 
            AND deadline >= ? AND deadline <= ?`,
      params: [todayStart, todayEnd],
    });

    const upcomingTopics = (upcomingResult.results || []) as Array<{
      id: string;
      title: string;
      authorEmail: string;
      deadline: number;
    }>;

    const todayTopics = (todayResult.results || []) as Array<{
      id: string;
      title: string;
      authorEmail: string;
      deadline: number;
    }>;

    // 通知を送信する処理
    const notifications: Array<{ userEmail: string; title: string; body: string; url: string }> = [];

    // 24時間前の通知
    for (const topic of upcomingTopics) {
      notifications.push({
        userEmail: topic.authorEmail,
        title: "締め切りリマインダー",
        body: `「${topic.title}」の締め切りまであと24時間です`,
        url: `/topic/${topic.id}`,
      });
    }

    // 当日の通知
    for (const topic of todayTopics) {
      notifications.push({
        userEmail: topic.authorEmail,
        title: "締め切り当日",
        body: `「${topic.title}」の締め切りは今日です！`,
        url: `/topic/${topic.id}`,
      });
    }

    // 各通知を送信
    for (const notification of notifications) {
      await fetch(`${process.env.NEXTAUTH_URL}/api/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      });
    }

    return NextResponse.json({
      message: "Deadline notifications processed",
      sentCount: notifications.length,
      upcoming: upcomingTopics.length,
      today: todayTopics.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
