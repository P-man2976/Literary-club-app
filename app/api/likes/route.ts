import { NextResponse } from "next/server";
import { getD1Client } from "@/app/lib/db";

// いいねを登録 (POST)
export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const { postId, userId } = await request.json();
    const requestUrl = new URL(request.url);

    const result = await db.insertLike(
      postId,
      userId || "anonymous"
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to like post" },
        { status: 500 }
      );
    }

    // 自分以外の投稿にいいねした場合、投稿者へ通知
    try {
      const postResult = await db.execute<any>({
        sql: `SELECT id, title, authorEmail, parentPostId FROM posts WHERE id = ? LIMIT 1`,
        params: [postId],
      });

      const targetPost = postResult.results?.[0] as any;
      const targetAuthorEmail = targetPost?.authorEmail || null;
      const likerId = userId || "anonymous";

      if (targetAuthorEmail && targetAuthorEmail !== likerId) {
        const topicId = targetPost?.parentPostId || targetPost?.id;
        const postTitle = targetPost?.title || "投稿";

        await fetch(`${requestUrl.origin}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: targetAuthorEmail,
            title: "新しいいいね",
            body: `あなたの「${postTitle}」にいいねが付きました`,
            url: `/topic/${topicId}`,
            tag: "like-notification",
          }),
        });
      }
    } catch (notifyError) {
      // 通知失敗でいいね処理を失敗させない
      console.error("Like notification error:", notifyError);
    }

    return NextResponse.json({ message: "Liked" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 特定の投稿のいいね合計数を取得 (GET)
export async function GET(request: Request) {
  try {
    const db = getD1Client();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const postIdsParam = searchParams.get("postIds");

    if (postIdsParam) {
      const postIds = postIdsParam.split(",").filter(Boolean);
      if (postIds.length === 0) {
        return NextResponse.json({});
      }

      const placeholders = postIds.map(() => "?").join(",");
      const result = await db.execute<any>({
        sql: `SELECT postId, userId, createdAt FROM likes WHERE postId IN (${placeholders}) ORDER BY createdAt DESC`,
        params: postIds,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to fetch likes" },
          { status: 500 }
        );
      }

      const likesByPostId: { [key: string]: string[] } = {};
      (result.results || []).forEach((row: any) => {
        if (!likesByPostId[row.postId]) likesByPostId[row.postId] = [];
        likesByPostId[row.postId].push(String(row.userId || "anonymous"));
      });

      return NextResponse.json(likesByPostId);
    }

    if (!postId) {
      return NextResponse.json(
        { error: "postId or postIds is required" },
        { status: 400 }
      );
    }

    const result = await db.getLikesCount(postId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch likes count" },
        { status: 500 }
      );
    }

    const count = result.results?.[0]?.count || 0;
    const usersResult = await db.execute<any>({
      sql: `SELECT userId FROM likes WHERE postId = ? ORDER BY createdAt DESC`,
      params: [postId],
    });

    if (!usersResult.success) {
      return NextResponse.json(
        { error: usersResult.error || "Failed to fetch like users" },
        { status: 500 }
      );
    }

    const userIds = (usersResult.results || []).map((row: any) => String(row.userId || "anonymous"));
    return NextResponse.json({ count, userIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// いいね解除 (DELETE)
export async function DELETE(request: Request) {
  try {
    const db = getD1Client();
    const { postId, userId } = await request.json();

    const result = await db.removeLike(postId, userId || "anonymous");

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to unlike post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Unliked" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}