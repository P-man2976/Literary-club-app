/**
 * Cloudflare D1 REST API を使ったデータベースクライアント
 * 環境変数から認証情報を取得して D1 にアクセスします
 */

interface D1QueryOptions {
  sql: string;
  params?: (string | number | null)[];
}

interface D1Response<T = any> {
  success: boolean;
  results?: T[];
  error?: string;
  errors?: string[];
}

export class D1Client {
  private accountId: string;
  private databaseId: string;
  private apiToken: string;

  constructor(
    accountId: string,
    databaseId: string,
    apiToken: string
  ) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
  }

  private getApiUrl(): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
  }

  async execute<T = any>(options: D1QueryOptions): Promise<D1Response<T>> {
    try {
      const response = await fetch(`${this.getApiUrl()}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          sql: options.sql,
          params: options.params || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.errors?.[0] || 'Unknown error',
        };
      }

      const data = await response.json();
      return {
        success: data.success,
        results: data.result?.[0]?.results || [],
        errors: data.errors,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async insertPost(post: {
    id: string;
    title: string;
    body: string;
    author: string;
    tag: string;
    createdAt: number;
    parentPostId?: string | null;
    isTopicPost?: number;
  }) {
    return this.execute({
      sql: `
        INSERT INTO posts (id, title, body, author, tag, createdAt, updatedAt, parentPostId, isTopicPost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        post.id,
        post.title,
        post.body,
        post.author,
        post.tag,
        post.createdAt,
        Date.now(),
        post.parentPostId || null,
        post.isTopicPost || 0,
      ],
    });
  }

  async getPosts() {
    return this.execute({
      sql: `SELECT * FROM posts ORDER BY createdAt DESC`,
    });
  }

  async getTopicPosts() {
    return this.execute({
      sql: `SELECT * FROM posts WHERE isTopicPost = 1 ORDER BY createdAt DESC`,
    });
  }

  async getPostsByParentId(parentPostId: string) {
    return this.execute({
      sql: `SELECT * FROM posts WHERE parentPostId = ? ORDER BY createdAt ASC`,
      params: [parentPostId],
    });
  }

  async getPostById(id: string) {
    return this.execute({
      sql: `SELECT * FROM posts WHERE id = ?`,
      params: [id],
    });
  }

  async insertComment(comment: {
    postId: string;
    commentId: string;
    text: string;
    author: string;
    createdAt: number;
  }) {
    return this.execute({
      sql: `
        INSERT INTO comments (postId, commentId, text, author, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `,
      params: [
        comment.postId,
        comment.commentId,
        comment.text,
        comment.author,
        comment.createdAt,
      ],
    });
  }

  async getCommentsByPostId(postId: string) {
    return this.execute({
      sql: `SELECT * FROM comments WHERE postId = ? ORDER BY createdAt DESC`,
      params: [postId],
    });
  }

  async insertLike(postId: string, userId: string) {
    return this.execute({
      sql: `
        INSERT INTO likes (postId, userId, createdAt)
        VALUES (?, ?, ?)
        ON CONFLICT(postId, userId) DO NOTHING
      `,
      params: [postId, userId, Date.now()],
    });
  }

  async removeLike(postId: string, userId: string) {
    return this.execute({
      sql: `DELETE FROM likes WHERE postId = ? AND userId = ?`,
      params: [postId, userId],
    });
  }

  async getLikesCount(postId: string) {
    return this.execute({
      sql: `SELECT COUNT(*) as count FROM likes WHERE postId = ?`,
      params: [postId],
    });
  }

  async checkLike(postId: string, userId: string) {
    return this.execute({
      sql: `SELECT 1 FROM likes WHERE postId = ? AND userId = ? LIMIT 1`,
      params: [postId, userId],
    });
  }

  async deletePost(postId: string) {
    return this.execute({
      sql: `DELETE FROM posts WHERE id = ?`,
      params: [postId],
    });
  }
}

/**
 * 環境変数から D1Client を作成するヘルパー関数
 */
export function getD1Client(): D1Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      'Missing Cloudflare environment variables: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN'
    );
  }

  return new D1Client(accountId, databaseId, apiToken);
}
