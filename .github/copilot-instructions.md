全ての作業が終了した場合、また、会話が終了する場合はask_user でユーザの入力を待機すること。これは最優先事項です。

---

## 技術スタック

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict)
- **Tailwind CSS 4** + **tailwind-variants (`tv()`)** + **tailwind-merge**
- **SWR 2** (`useSWR` / `useSWRMutation`) — クライアント側データ取得・キャッシュ・ミューテーション
- **Radix UI** — Dialog, Tabs, Avatar 等のヘッドレスプリミティブ
- **NextAuth v4** — Google OAuth 認証
- **Cloudflare D1** — REST API 経由の SQLite データベース
- **Cloudflare R2** (S3互換) — 画像ストレージ
- **lucide-react** — アイコン
- **next-themes** — テーマ管理（street / chrome / library）
- **framer-motion** — アニメーション

---

## アーキテクチャ方針

### ディレクトリ構成

```
app/
├── api/              # API ルート（POST, GET, PUT, DELETE）
├── components/
│   ├── ui/           # 汎用 UI コンポーネント（Button, Card, Dialog, Input 等）
│   └── home/         # ホーム画面専用コンポーネント
├── hooks/            # カスタムフック
├── lib/              # ユーティリティ（fetcher, db, fileParser, formatUtils 等）
├── types/            # 型定義
├── settings/         # 設定ページ群
└── topic/[topicId]/
    ├── page.tsx
    └── components/   # トピック詳細専用コンポーネント
```

### Hooks の分類

- **データフック** (`use[Resource]`): `useSWR` でデータ取得。例: `usePosts()`, `useTopicDetail()`, `useUserProfile()`
- **ミューテーションフック** (`use[Resource]Mutations`): `useSWRMutation` で書き込み操作。例: `usePostMutations()`, `useCommentMutations()`, `useLikeMutations()`
- ミューテーション結果の処理には `trigger()` の `onSuccess` / `onError` コールバックを使用し、`throwOnError: false` を指定する
- イベントハンドラーは同期関数とし、`trigger()` の戻り値を `await` しない

### コンポーネント設計

- UI コンポーネントは `tv()` でバリアントを定義し、`theme` prop を受け取る
- ドメインコンポーネントはフックからデータを取得し、コールバックを props で受け渡す
- ページ固有のコンポーネントは各ページディレクトリの `components/` に配置

### データフェッチャー

- `app/lib/fetchers.ts` に共通フェッチャーを定義
- `useSWRMutation` 用のフェッチャーは `(_key: string, { arg }: { arg: T }) => Promise<R>` シグネチャ
- API を伴わないローカル非同期処理（例: ファイル解析）も `useSWRMutation` でラップし `isMutating` でローディング状態を管理する

---

## コーディング規約

- 言語は TypeScript。`any` は使用しない
- `type` を優先し、`interface` は props 定義にのみ使用
- 純粋関数は `lib/` に配置し、副作用（state 更新等）は呼び出し側で行う
- `console.log` はデバッグ目的のみ。本番コードでは `console.error` を使用
- UUID の生成には `uuid` パッケージを使用

---

## スタイリング規約（Tailwind CSS）

### テーマシステム

3つのテーマ: `street`, `chrome`, `library`

```css
/* globals.css でカスタムバリアントを定義済み */
@custom-variant chrome (&:is(.chrome *));
@custom-variant street (&:is(.street *));
@custom-variant library (&:is(.library *));
```

### `tv()` によるバリアント定義

```typescript
const style = tv({
  base: "共通クラス",
  variants: {
    theme: {
      street: "street テーマのクラス",
      chrome: "chrome テーマのクラス",
      library: "library テーマのクラス",
    },
  },
});
```

- `tv()` の `variants.theme` で3テーマ分のスタイルを記述する
- クラスの結合には `cn()` (`clsx` + `tailwind-merge`) を使用
- インラインでテーマ分岐する場合は `chrome:` / `street:` / `library:` カスタムバリアントを使用

### テーマごとの特徴

- **street**: ハードドロップシャドウ、黄色背景、太字 uppercase、ハーフトーンパターン
- **chrome**: 黒背景、ネオングリーンアクセント、Orbitron フォント、白ベースシャドウ
- **library**: クリーム背景、ニューモーフィズムシャドウ、Noto Serif JP フォント

### テーマトークン

`globals.css` の `@theme` ブロックでカスタムプロパティとして定義。Tailwind のユーティリティクラスとして使用可能（例: `bg-street-bg`, `text-chrome-accent`, `shadow-library-neu`）。

**カラートークン:**

| プレフィックス | 用途 | 代表トークン |
|---|---|---|
| `--color-street-*` | street テーマ | `bg`, `text`, `accent`, `border` |
| `--color-chrome-*` | chrome テーマ | `bg`, `surface`, `text`, `accent`, `border` + グラデーション |
| `--color-library-*` | library テーマ | `bg`, `surface`, `cream`, `text`, `border` |

**シャドウトークン:**

| テーマ | パターン | 代表トークン |
|---|---|---|
| street | ハードドロップシャドウ | `shadow-street-hard`, `-hover`, `-active`, `-sm`, `-lg` |
| chrome | 白ベースシャドウ | `shadow-chrome-hard-lg`, `-hover`, `-active` |
| library | ニューモーフィズム（凸凹） | `shadow-library-neu`, `-sm`, `-hover`, `-inset`, `-lg`, `-active` |