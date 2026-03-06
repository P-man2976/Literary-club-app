import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_IMAGES_DELIVERY_BASE = process.env.CLOUDFLARE_IMAGES_DELIVERY_BASE || "";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing Cloudflare env vars" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "画像ファイルを選択してください" }, { status: 400 });
    }

    if (file.size > 1_000_000) {
      return NextResponse.json({ error: "画像は1MB以下にしてください" }, { status: 400 });
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file, file.name);
    uploadForm.append("metadata", JSON.stringify({
      uploader: session.user.email,
      uploadedAt: Date.now(),
    }));

    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`;
    const cfRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
      body: uploadForm,
    });

    const cfJson = await cfRes.json();

    if (!cfRes.ok || !cfJson?.success) {
      return NextResponse.json(
        { error: cfJson?.errors?.[0]?.message || "Cloudflare Images upload failed" },
        { status: 502 }
      );
    }

    const variants: string[] = cfJson?.result?.variants || [];
    const imageId: string = cfJson?.result?.id;

    let imageUrl = variants[0] || "";
    if (!imageUrl && CLOUDFLARE_IMAGES_DELIVERY_BASE && imageId) {
      imageUrl = `${CLOUDFLARE_IMAGES_DELIVERY_BASE}/${imageId}/public`;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "画像URLの取得に失敗しました" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("image upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
