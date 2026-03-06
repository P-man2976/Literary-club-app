import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

function parseAiTags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function d1Query(url: string, sql: string, params: any[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const text = await response.text();
  if (!response.ok) {
    return { ok: false as const, data: null, error: text || response.statusText };
  }

  try {
    const data = JSON.parse(text);
    if (data?.success === false || data?.result?.[0]?.success === false) {
      return {
        ok: false as const,
        data: null,
        error: data?.errors?.[0]?.message || data?.result?.[0]?.error || "D1 query failed",
      };
    }
    return { ok: true as const, data, error: "" };
  } catch {
    return { ok: false as const, data: null, error: "Invalid D1 JSON response" };
  }
}

export async function GET() {
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
    const query = await d1Query(
      url,
      `SELECT email, penName, userIcon, selfIntro, aiSummary, aiTagsJson, aiUpdatedAt, updatedAt
       FROM userProfiles
       ORDER BY updatedAt DESC`,
      []
    );

    if (!query.ok || !query.data) {
      return NextResponse.json(
        { error: "userProfiles schema is not migrated. Run latest migrations first." },
        { status: 500 }
      );
    }

    const profiles = (query.data.result[0]?.results || []).map((profile: any) => ({
      email: profile.email,
      penName: profile.penName,
      userIcon: profile.userIcon,
      selfIntro: profile.selfIntro || "",
      aiSummary: profile.aiSummary || "",
      aiTags: parseAiTags(profile.aiTagsJson),
      aiUpdatedAt: Number(profile.aiUpdatedAt || 0),
      updatedAt: Number(profile.updatedAt || 0),
    }));

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Profiles GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Invalid emails array" }, { status: 400 });
    }

    const uniqueEmails = [...new Set(emails)];
    const placeholders = uniqueEmails.map(() => "?").join(", ");

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
    const query = await d1Query(
      url,
      `SELECT email, penName, userIcon, selfIntro, aiSummary, aiTagsJson, aiUpdatedAt
       FROM userProfiles
       WHERE email IN (${placeholders})`,
      uniqueEmails as any[]
    );

    if (!query.ok || !query.data) {
      return NextResponse.json(
        { error: "userProfiles schema is not migrated. Run latest migrations first." },
        { status: 500 }
      );
    }

    const profiles = query.data.result[0]?.results || [];

    const penNameMap: { [key: string]: string } = {};
    const userIconMap: { [key: string]: string } = {};
    const selfIntroMap: { [key: string]: string } = {};
    const aiSummaryMap: { [key: string]: string } = {};
    const aiTagsMap: { [key: string]: string[] } = {};
    const aiUpdatedAtMap: { [key: string]: number } = {};

    profiles.forEach((profile: any) => {
      penNameMap[profile.email] = profile.penName || "";
      if (profile.userIcon) {
        userIconMap[profile.email] = profile.userIcon;
      }
      selfIntroMap[profile.email] = profile.selfIntro || "";
      aiSummaryMap[profile.email] = profile.aiSummary || "";
      aiTagsMap[profile.email] = parseAiTags(profile.aiTagsJson);
      aiUpdatedAtMap[profile.email] = Number(profile.aiUpdatedAt || 0);
    });

    return NextResponse.json({
      penNameMap,
      userIconMap,
      selfIntroMap,
      aiSummaryMap,
      aiTagsMap,
      aiUpdatedAtMap,
    });
  } catch (error) {
    console.error("Profiles POST error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
