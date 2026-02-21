import { NextResponse } from "next/server";
import { getD1Client } from "@/app/lib/db";

// いいねを登録 (POST)
export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const { postId, userId } = await request.json();

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

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
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
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// いいね解除 (DELETE)
export async function DELETE(request: Request) {
  try {
    const db = getD1Client();
    const { postId, userId } = await request.json();

    const result = await db.removeLike(postId, userId || "guest");

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