This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 📚 プロジェクト情報

**文学部アプリ** - 創作作品の共有・コメント・いいね機能

- **フロントエンド**：Next.js 16
- **認証**：NextAuth（Google ログイン）
- **データベース**：Cloudflare D1（SQLite）
- **ホスト**：Cloudflare Pages（無料）

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
