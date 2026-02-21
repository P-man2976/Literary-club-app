import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getD1Client } from "@/app/lib/db";

// コメント投稿 (POST)
export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();

    const commentId = uuidv4();
    const result = await db.insertComment({
      postId: data.postId,
      commentId: commentId,
      text: data.text,
      author: data.author,
      createdAt: Date.now(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Success", commentId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 特定の投稿のコメント取得 (GET)
// URL例: /api/comments?postId=xxxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    const db = getD1Client();
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