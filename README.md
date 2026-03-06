# Literary Club Portal

## 📚 プロジェクト情報

**文学部アプリ** - 創作作品の共有・コメント・いいね機能

- **フロントエンド**：Next.js 16 + HeroUI
- **認証**：NextAuth（Google ログイン）
- **データベース**：Cloudflare D1（SQLite）
- **ホスト**：Cloudflare Pages（無料）
- **PWA対応**：オフライン対応、ホーム画面追加可能
- **プッシュ通知**：締め切りリマインダー

---

## ✨ 主な機能

### 基本機能
- 🔐 Google ログイン認証
- 📝 お題の投稿・作品の投稿
- 💬 コメント機能（編集可能、編集済みラベル表示）
- ❤️ いいね機能
- 👤 カスタムアイコン・ペンネーム設定
- 🌓 ライト/ダーク/システムテーマ切り替え

### お題機能
- 📌 お題の作成と投稿
- ⏰ 締め切り設定（任意）
- 🔔 締め切りリマインダー（24時間前、当日）
- 🚫 締め切り後の投稿制限
- 👥 参加者アイコン表示

### PWA機能
- 📱 ホーム画面に追加可能
- 🔔 プッシュ通知対応
- 📴 オフライン対応（Service Worker）
- 🎨 ネイティブアプリ風UI

---

## 🚀 クイックスタート

### ローカル開発

```bash
npm run dev
# または
yarn dev
npm run pnpm dev
bun dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開く

### AI講評機能の環境変数（無料API）

お題詳細ページの「AI講評」は Hugging Face Inference API（無料枠あり）を使用します。

```bash
HUGGINGFACE_API_TOKEN=your_hf_token
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
# 任意（通常は不要）
HUGGINGFACE_BASE_URL=https://api-inference.huggingface.co/models
```

### アイコン画像アップロード（Cloudflare R2）

ユーザーアイコンは **Cloudflare R2（無料オブジェクトストレージ）** に保存します。

**セキュリティ & パフォーマンス最適化：**
- 📧 メールアドレスは **SHA-256でハッシュ化** してファイル名として使用（セキュリティ対策）
- 🖼️ アップロード時に **バックエンドで自動リサイズ**（128x128px、JPEG、品質85%）
- 🚀 一貫したURLで高速読み込み（CDNキャッシュ対応）

```bash
# R2設定（Cloudflare ダッシュボードで取得）
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=user-icons

# R2 Public URL（バケット設定で有効化）
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
# またはカスタムドメイン使用時
# R2_PUBLIC_URL=https://icons.yourdomain.com

# フロントエンド用（NEXT_PUBLIC_ プレフィックス必須）
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**R2の設定手順：**
1. Cloudflare ダッシュボード → R2 → バケット作成（例: `user-icons`）
2. バケット設定 → Public Access を有効化 → Public URL をコピー
3. Manage R2 API Tokens → API Token 作成（Read & Write 権限）
4. 上記環境変数を `.env.local` に設定

### 本番へデプロイ

📖 **詳細は [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) を参照**

```bash
# 1️⃣ GitHub へプッシュ
git add .
git commit -m "Your message"
git push origin main

# 2️⃣-5️⃣ Cloudflare Pages に自動デプロイ
```

---

## 📖 ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | デプロイ完全ガイド（6 ステップ） |
| [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) | DynamoDB → D1 移行レポート |
| [PWA_ICON_SETUP.md](PWA_ICON_SETUP.md) | PWA アイコン設定手順 |

---

## ✏️ コード編集

ページを編集するには `app/page.tsx` を変更してください。自動でリロードされます。

このプロジェクトは [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) を使用して、[Geist](https://vercel.com/font) フォントを最適化・読み込みしています。

---

## 📚 さらに学ぶ

- [Next.js Documentation](https://nextjs.org/docs) - Next.js の機能について
- [Learn Next.js](https://nextjs.org/learn) - インタラクティブ Next.js チュートリアル
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/) - D1 について
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/) - Pages について

---

## 🚀 デプロイ（Cloudflare Pages）

**推奨方法**：GitHub 連携による自動デプロイ

詳細な手順は [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#-デプロイの-6-ステップ) を参照してください。

---

## 📝 License

MIT
