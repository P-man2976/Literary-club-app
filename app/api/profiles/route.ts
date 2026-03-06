import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// 複数のメールアドレスからペンネームとアイコンを一括取得
export async function POST(request: Request) {
  try {
    const { emails } = await request.json();
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Invalid emails array" }, { status: 400 });
    }

    // 重複を除去
    const uniqueEmails = [...new Set(emails)];

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
    
    // プレースホルダーを作成（?, ?, ?）
    const placeholders = uniqueEmails.map(() => "?").join(", ");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `SELECT email, penName, userIcon FROM userProfiles WHERE email IN (${placeholders})`,
        params: uniqueEmails,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare D1 API error: ${response.statusText}`);
    }

    const data = await response.json();
    const profiles = data.result[0]?.results || [];

    // email → penName / userIcon のマップを作成
    const penNameMap: { [key: string]: string } = {};
    const userIconMap: { [key: string]: string } = {};
    profiles.forEach((profile: any) => {
      penNameMap[profile.email] = profile.penName;
      if (profile.userIcon) {
        userIconMap[profile.email] = profile.userIcon;
      }
    });

    return NextResponse.json({ penNameMap, userIconMap });
  } catch (error) {
    console.error("Profiles GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
  }
}
