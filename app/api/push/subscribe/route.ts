import { NextResponse } from "next/server";
import { getD1Client } from "@/app/lib/db";

// プッシュ通知サブスクリプションを保存
export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();
    const { userEmail, endpoint, keys } = data;

    if (!userEmail || !endpoint || !keys) {
      return NextResponse.json(
        { error: "userEmail, endpoint, and keys are required" },
        { status: 400 }
      );
    }

    // 既存のサブスクリプションを確認
    const checkResult = await db.execute({
      sql: `SELECT id FROM pushSubscriptions WHERE userEmail = ? AND endpoint = ?`,
      params: [userEmail, endpoint],
    });

    if (checkResult.results && checkResult.results.length > 0) {
      // 既に存在する場合は更新
      const updateResult = await db.execute({
        sql: `UPDATE pushSubscriptions SET keys = ?, updatedAt = ? WHERE userEmail = ? AND endpoint = ?`,
        params: [JSON.stringify(keys), Date.now(), userEmail, endpoint],
      });

      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.error || "Failed to update subscription" },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Subscription updated" });
    } else {
      // 新規作成
      const insertResult = await db.execute({
        sql: `INSERT INTO pushSubscriptions (id, userEmail, endpoint, keys, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          crypto.randomUUID(),
          userEmail,
          endpoint,
          JSON.stringify(keys),
          Date.now(),
          Date.now(),
        ],
      });

      if (!insertResult.success) {
        return NextResponse.json(
          { error: insertResult.error || "Failed to save subscription" },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Subscription saved" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// サブスクリプションを削除
export async function DELETE(request: Request) {
  try {
    const db = getD1Client();
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("userEmail");
    const endpoint = searchParams.get("endpoint");

    if (!userEmail || !endpoint) {
      return NextResponse.json(
        { error: "userEmail and endpoint are required" },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: `DELETE FROM pushSubscriptions WHERE userEmail = ? AND endpoint = ?`,
      params: [userEmail, endpoint],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Subscription deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
