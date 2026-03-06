import { NextResponse } from "next/server";

// Posts-based profile analysis shell endpoint.
// TODO: Replace with actual AI summarization pipeline (scheduled refresh/job queue).
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    return NextResponse.json(
      {
        ready: false,
        mode: "posts-based-shell",
        message: "AI analysis is not enabled yet. This endpoint is a placeholder for periodic post-based refresh.",
        email,
      },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
