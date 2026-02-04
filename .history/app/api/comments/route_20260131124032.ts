import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// コメント投稿 (POST)
export async function POST(request: Request) {
  const data = await request.json();
  const command = new PutCommand({
    TableName: "lit-club-comments",
    Item: {
      postId: data.postId,
      commentId: uuidv4(),
      text: data.text,
      author: data.author,
      createdAt: Date.now(),
    },
  });

  try {
    await docClient.send(command);
    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 特定の投稿のコメント取得 (GET)
// URL例: /api/comments?postId=xxxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");

  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

  const command = new QueryCommand({
    TableName: "lit-club-comments",
    KeyConditionExpression: "postId = :pid",
    ExpressionAttributeValues: { ":pid": postId },
  });

  try {
    const response = await docClient.send(command);
    return NextResponse.json(response.Items || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}