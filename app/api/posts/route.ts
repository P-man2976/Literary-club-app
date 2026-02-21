import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getD1Client } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const db = getD1Client();
    const data = await request.json();

    const postId = uuidv4();
    const result = await db.insertPost({
      id: postId,
      title: data.title,
      body: data.body,
      author: data.author,
      tag: data.tag || "創作",
      createdAt: Date.now(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save post" },
        { status: 500 }
      );
    }

    console.log("✅ D1 Save Success!");
    return NextResponse.json({ message: "Success", id: postId });
  } catch (error: any) {
    console.error("❌ D1 Save Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = getD1Client();
    const result = await db.getPosts();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to fetch posts" },
        { status: 500 }
      );
    }

    const posts = result.results || [];
    return NextResponse.json(posts);
  } catch (error: any) {
    console.error("❌ D1 Fetch Error:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}