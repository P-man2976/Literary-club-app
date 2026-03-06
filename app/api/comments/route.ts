import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getD1Client } from "@/app/lib/db";

// コメント投稿 (POST)
export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();
    const requestUrl = new URL(request.url);

    const commentId = uuidv4();
    const result = await db.insertComment({
      postId: data.postId,
      commentId: commentId,
      text: data.text,
      author: data.author,
      authorEmail: data.authorEmail || null,
      createdAt: Date.now(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save comment" },
        { status: 500 }
      );
    }

    // 自分以外の投稿にコメントした場合、投稿者へ通知
    try {
      const postResult = await db.execute<any>({
        sql: `SELECT id, title, authorEmail, parentPostId FROM posts WHERE id = ? LIMIT 1`,
        params: [data.postId],
      });

      const targetPost = postResult.results?.[0] as any;
      const targetAuthorEmail = targetPost?.authorEmail || null;
      const commenterEmail = data.authorEmail || null;

      if (targetAuthorEmail && targetAuthorEmail !== commenterEmail) {
        const topicId = targetPost?.parentPostId || targetPost?.id;
        const postTitle = targetPost?.title || "投稿";
        const commenterName = data.author || "部員";

        await fetch(`${requestUrl.origin}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: targetAuthorEmail,
            title: "新しいコメント",
            body: `${commenterName}さんが「${postTitle}」にコメントしました`,
            url: `/topic/${topicId}`,
            tag: "comment-notification",
          }),
        });
      }
    } catch (notifyError) {
      // 通知失敗でコメント投稿を失敗させない
      console.error("Comment notification error:", notifyError);
    }

    return NextResponse.json({ message: "Success", commentId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 特定の投稿のコメント取得 (GET)
// URL例: 
// - 単一: /api/comments?postId=xxxx
// - 複数: /api/comments?postIds=xxx,yyy,zzz (カンマ区切り)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const postIdsParam = searchParams.get("postIds");

    const db = getD1Client();

    // 複数postIDの場合 (一括取得)
    if (postIdsParam) {
      const postIds = postIdsParam.split(",").filter(Boolean);
      if (postIds.length === 0) {
        return NextResponse.json({});
      }

      const placeholders = postIds.map(() => "?").join(",");
      const result = await db.execute<any>({
        sql: `SELECT * FROM comments WHERE postId IN (${placeholders}) ORDER BY createdAt ASC`,
        params: postIds,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to fetch comments" },
          { status: 500 }
        );
      }

      // postIdごとにグループ化
      const commentsByPostId: { [key: string]: any[] } = {};
      (result.results || []).forEach((comment: any) => {
        if (!commentsByPostId[comment.postId]) {
          commentsByPostId[comment.postId] = [];
        }
        commentsByPostId[comment.postId].push(comment);
      });

      return NextResponse.json(commentsByPostId);
    }

    // 単一postIDの場合 (従来通り)
    if (!postId) {
      return NextResponse.json(
        { error: "postId or postIds is required" },
        { status: 400 }
      );
    }

    const result = await db.getCommentsByPostId(postId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.results || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// コメント編集 (PUT)
export async function PUT(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();
    const { commentId, text, authorEmail } = data;

    if (!commentId || !text || !authorEmail) {
      return NextResponse.json(
        { error: "commentId, text, and authorEmail are required" },
        { status: 400 }
      );
    }

    const result = await db.updateComment({
      commentId,
      text,
      authorEmail,
      editedAt: Date.now(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// コメント削除 (DELETE)
export async function DELETE(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();
    const { commentId, authorEmail } = data;

    if (!commentId || !authorEmail) {
      return NextResponse.json(
        { error: "commentId and authorEmail are required" },
        { status: 400 }
      );
    }

    const result = await db.deleteComment({
      commentId,
      authorEmail,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}