/**
 * メールアドレスをSHA-256でハッシュ化
 * Web Crypto API を使用し、ブラウザ/Node.js/Cloudflare Workers で動作
 */
export async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * R2 Public URL の定数
 */
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

/**
 * ハッシュ済みメールアドレスからアイコンURLを構築
 */
export function buildIconUrl(hashedEmail: string): string {
  return `${R2_PUBLIC_URL}/${hashedEmail}.jpg`;
}

/**
 * 画像のデフォルトサイズ（統一）
 */
export const DEFAULT_ICON_SIZE = {
  width: 128,
  height: 128,
};
