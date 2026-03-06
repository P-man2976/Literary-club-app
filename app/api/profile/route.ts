import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// ペンネーム・アイコンを取得
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT penName, userIcon FROM userProfiles WHERE email = ?",
        params: [session.user.email],
      }),
    });

    if (!response.ok) {
      console.error("D1 Response:", await response.text());
      throw new Error(`Cloudflare D1 API error: ${response.statusText}`);
    }

    const data = await response.json();
    const profile = data.result[0]?.results?.[0];

    return NextResponse.json({ 
      penName: profile?.penName || null,
      userIcon: profile?.userIcon || null,
      email: session.user.email 
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// ペンネーム・アイコンを保存
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { penName, userIcon } = await request.json();
    
    // バリデーション
    if (penName !== undefined && penName !== null) {
      if (penName.trim().length === 0) {
        return NextResponse.json({ error: "ペンネームを入力してください" }, { status: 400 });
      }
      if (penName.length > 50) {
        return NextResponse.json({ error: "ペンネームは50文字以内にしてください" }, { status: 400 });
      }
    }

    if (userIcon !== undefined && userIcon !== null) {
      if (userIcon.length > 1000000) {
        return NextResponse.json({ error: "アイコン画像は1MB以下にしてください" }, { status: 400 });
      }
    }

    if (!penName && !userIcon) {
      return NextResponse.json({ error: "更新するデータがありません" }, { status: 400 });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
    
    // 常に両方の値を指定する：アイコンのみの場合は penName を空文字列、ペンネームのみの場合は userIcon を NULL に
    const finalPenName = penName !== undefined && penName !== null ? penName.trim() : "";
    const finalUserIcon = userIcon || null;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `INSERT INTO userProfiles (email, penName, userIcon, createdAt, updatedAt) 
              VALUES (?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
              ON CONFLICT(email) DO UPDATE SET 
                penName = ?,
                userIcon = ?,
                updatedAt = strftime('%s', 'now')`,
        params: [
          session.user.email, 
          finalPenName, 
          finalUserIcon, 
          finalPenName, 
          finalUserIcon
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("D1 Response:", errorText);
      throw new Error(`Cloudflare D1 API error: ${response.statusText}`);
    }

    return NextResponse.json({ 
      success: true, 
      penName: finalPenName || null,
      userIcon: finalUserIcon || null
    });
  } catch (error) {
    console.error("Profile POST error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
