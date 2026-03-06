import { NextResponse } from "next/server";
import { getD1Client } from "@/app/lib/db";

type AnalysisResponse = {
  overview: string;
  strengths: string[];
  suggestions: string[];
  authorFeedback: Array<{
    author: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
  postFeedback: Array<{
    postId: string;
    title: string;
    praise: string;
    critique: string;
    nextStep: string;
  }>;
};

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

export async function POST(request: Request) {
  try {
    const { topicId } = await request.json();

    if (!topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 });
    }

    const hfToken = process.env.HUGGINGFACE_API_TOKEN;
    const model = process.env.HUGGINGFACE_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
    const baseUrl = process.env.HUGGINGFACE_BASE_URL || "https://api-inference.huggingface.co/models";

    if (!hfToken) {
      return NextResponse.json(
        { error: "HUGGINGFACE_API_TOKEN is not configured" },
        { status: 503 }
      );
    }

    const db = getD1Client();
    const postsResult = await db.getPosts();

    if (!postsResult.success || !postsResult.results) {
      return NextResponse.json(
        { error: postsResult.error || "Failed to load posts" },
        { status: 500 }
      );
    }

    const allPosts = postsResult.results as any[];
    const topic = allPosts.find((p) => p.id === topicId && p.isTopicPost === 1);

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const replies = allPosts
      .filter((p) => p.parentPostId === topicId)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    if (replies.length === 0) {
      return NextResponse.json(
        { error: "No replies yet for analysis" },
        { status: 400 }
      );
    }

    const authorKeys = new Set<string>();
    for (const reply of replies) {
      const key = reply.authorEmail || `name:${reply.author}`;
      authorKeys.add(key);
    }

    const authorHistory = Array.from(authorKeys).map((key) => {
      const history = allPosts
        .filter((p) => {
          const postKey = p.authorEmail || `name:${p.author}`;
          return postKey === key && p.id !== topicId && p.parentPostId !== topicId;
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          title: p.title,
          tag: p.tag,
          body: String(p.body || "").slice(0, 600),
          createdAt: p.createdAt,
        }));

      const sample = replies.find((r) => (r.authorEmail || `name:${r.author}`) === key);
      return {
        author: sample?.author || "匿名",
        authorEmail: sample?.authorEmail || null,
        history,
      };
    });

    const payload = {
      topic: {
        id: topic.id,
        title: topic.title,
        body: topic.body,
        deadline: topic.deadline || null,
      },
      replies: replies.map((r) => ({
        id: r.id,
        title: r.title,
        body: String(r.body || "").slice(0, 1200),
        author: r.author,
        authorEmail: r.authorEmail || null,
        createdAt: r.createdAt,
      })),
      authorHistory,
    };

    const prompt = [
      "あなたは文芸部の講評アシスタントです。",
      "以下の入力を分析し、必ずJSONのみを返してください。説明文は不要です。",
      "人格否定や侮辱は禁止。具体的で建設的に。",
      "JSONの型:",
      "{",
      '  "overview": string,',
      '  "strengths": string[],',
      '  "suggestions": string[],',
      '  "authorFeedback": [{ "author": string, "praise": string, "critique": string, "nextStep": string }],',
      '  "postFeedback": [{ "postId": string, "title": string, "praise": string, "critique": string, "nextStep": string }]',
      "}",
      "入力:",
      JSON.stringify(payload),
    ].join("\n\n");

    const aiRes = await fetch(`${baseUrl}/${encodeURIComponent(model)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 900,
          temperature: 0.6,
          return_full_text: false,
        },
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return NextResponse.json(
        { error: `AI request failed: ${text}` },
        { status: 502 }
      );
    }

    const aiJson = await aiRes.json();
    const generated = Array.isArray(aiJson)
      ? aiJson?.[0]?.generated_text
      : aiJson?.generated_text;

    if (!generated || typeof generated !== "string") {
      return NextResponse.json(
        { error: "AI response format is invalid" },
        { status: 502 }
      );
    }

    const jsonText = extractJsonObject(generated);
    if (!jsonText) {
      return NextResponse.json(
        { error: "Failed to extract JSON from model output" },
        { status: 502 }
      );
    }

    const parsed = safeJsonParse<AnalysisResponse>(jsonText);

    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse AI JSON output" },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("analysis api error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
