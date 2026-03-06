/**
 * メールアドレスをSHA-256でハッシュ化
 * セキュリティのため、メールアドレスを直接ファイル名に使わない
 */
export function hashEmail(email: string): string {
  // ブラウザ環境とNode.js環境の両方で動作
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // ブラウザ環境（非同期なので、実際には使わない想定）
    throw new Error('Use hashEmailSync in browser environment');
  }
  
  // Node.js環境（サーバーサイド）
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * メールアドレスから画像URLを生成
 * R2_PUBLIC_URLが設定されていれば、常に一貫したURLを返す
 */
export function getUserIconUrl(
  email: string | null | undefined,
  storedUrl?: string | null
): string | null {
  if (!email) return null;

  // 環境変数からR2 Public URLを取得（クライアント側でも使える想定）
  const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (R2_PUBLIC_URL) {
    // メールアドレスをハッシュ化してファイル名として使用
    const hashedEmail = hashEmail(email);
    return `${R2_PUBLIC_URL}/${hashedEmail}.jpg`;
  }

  // R2設定がない場合は、DBに保存されたURLを返す（後方互換性）
  return storedUrl || null;
}

/**
 * 画像のデフォルトサイズ（統一）
 */
export const DEFAULT_ICON_SIZE = {
  width: 128,
  height: 128,
};

/**
 * アバター画像の表示用props
 */
export function getAvatarProps(email: string | null | undefined, storedUrl?: string | null) {
  const src = getUserIconUrl(email, storedUrl);
  
  return {
    src: src || undefined,
    icon: !src ? undefined : undefined, // アイコンがない場合のフォールバック
    className: "shrink-0",
    size: "sm" as const,
  };
}
