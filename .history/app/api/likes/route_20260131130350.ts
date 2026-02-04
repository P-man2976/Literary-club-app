import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// いいねを登録 (POST)
export async function POST(request: Request) {
  const { postId, userId } = await request.json();

  const command = new PutCommand({
    TableName: "lit-club-likes",
    Item: {
      postId: postId,
      userId: userId || "anonymous", // 匿名でもOKにするなら
      createdAt: Date.now(),
    },
  });

  try {
    await docClient.send(command);
    return NextResponse.json({ message: "Liked" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 特定の投稿のいいね合計数を取得 (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");

  const command = new QueryCommand({
    TableName: "lit-club-likes",
    KeyConditionExpression: "postId = :pid",
    ExpressionAttributeValues: { ":pid": postId },
    Select: "COUNT", // データ中身はいらない、数だけ欲しい
  });

  try {
    const response = await docClient.send(command);
    return NextResponse.json({ count: response.Count || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

//2どおしでいいね解除
export async function DELETE(request: Request) {
  const { postId, userId } = await request.json();

  const command = new DeleteCommand({
    TableName: "lit-club-likes",
    Key: {
      postId: postId,
      userId: userId || "guest", // 保存時と同じIDを指定
    },
  });

  try {
    await docClient.send(command);
    return NextResponse.json({ message: "Unliked" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}