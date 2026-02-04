import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
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

export async function POST(request: Request) {
  const data = await request.json();

  const command = new PutCommand({
    TableName: "lit-club-posts",
    Item: {
      id: uuidv4(), // ランダムなIDを生成
      createdAt: Date.now(),
      title: data.title,
      body: data.body,
      author: data.author,
      tag: data.tag || "創作",
    },
  });

  try {
    await docClient.send(command);
    return NextResponse.json({ message: "Success" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save post" }, { status: 500 });
  }
}