# Lets_make_app_copilot
全部Copilotに作らせる。

# いえログ 🏠

家庭のあれこれを整理・把握できるアプリです。まずは「サブスク管理」から。

## 機能

### MVP実装済み
- ✅ サブスク管理（CRUD）
- ✅ 月額/年額の合計表示
- ✅ USD→JPYリアルタイム換算（Frankfurter API）
- ✅ 端末間データ同期（Firebase Firestore + 共有コード）
- ✅ スマホファーストUI（下部ナビ、FAB）
- ✅ PWA対応

### 今後の拡張予定
- 家電メンテナンス管理
- その他のジャンル追加

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイリング | SCSS (CSS Modules) |
| フォーム | React Hook Form + Zod |
| 状態管理 | React Context |
| データベース | Firebase Firestore |
| 為替API | Frankfurter API (ECB公式、キー不要) |
| デプロイ | 静的エクスポート (さくらサーバー対応) |

---

## セットアップ手順

### 1. パッケージインストール

```bash
npm install
```

### 2. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. Firestoreを有効化
3. `.env.local.example` をコピーして `.env.local` を作成
4. Firebase設定値を記入

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Firestoreセキュリティルール

Firebase Consoleで以下のルールを設定:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{shareCode} {
      allow read, write: if true;  // MVP用。本番では認証を追加
    }
  }
}
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

---

## デプロイ手順（さくらサーバー）

### 1. ビルド

```bash
npm run build
```

`out/` ディレクトリに静的ファイルが生成されます。

### 2. アップロード

`out/` ディレクトリの内容をさくらサーバーにFTPでアップロード。

```
out/
├── index.html
├── subscriptions/
├── _next/
├── manifest.json
└── ...
```

---

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # メインレイアウトグループ
│   │   ├── layout.tsx     # メインレイアウト
│   │   ├── page.tsx       # TOP画面
│   │   └── subscriptions/
│   │       └── page.tsx   # サブスク管理画面
│   └── layout.tsx         # ルートレイアウト
├── components/            # UIコンポーネント
│   ├── ConfirmDialog/
│   ├── Header/
│   ├── Modal/
│   ├── Navigation/
│   ├── ShareCodeSetup/
│   ├── SubscriptionForm/
│   └── Toast/
├── config/                # 設定ファイル
│   ├── constants.ts       # 定数
│   └── genres.ts          # ジャンル定義（拡張用）
├── contexts/              # React Context
│   └── AppContext.tsx     # アプリ全体の状態管理
├── lib/                   # ユーティリティ
│   ├── exchange.ts        # 為替レート取得
│   ├── firebase.ts        # Firebase設定
│   └── firestore.ts       # Firestoreデータ操作
├── styles/                # グローバルスタイル
│   ├── _variables.scss    # SCSS変数
│   ├── _reset.scss        # リセットCSS
│   └── globals.scss       # グローバルスタイル
└── types/                 # TypeScript型定義
    └── index.ts
```

---

## ジャンル追加の方法（拡張ガイド）

### 1. ジャンル定義を追加

[src/config/genres.ts](src/config/genres.ts) を編集:

```typescript
export const genres: Genre[] = [
  {
    id: "subscriptions",
    name: "サブスク",
    icon: "💳",
    path: "/subscriptions",
  },
  // 新規追加
  {
    id: "appliances",
    name: "家電",
    icon: "🔌",
    path: "/appliances",
  },
];
```

### 2. ページを作成

`src/app/(main)/appliances/page.tsx` を作成

### 3. 型定義を追加

`src/types/index.ts` に新しいデータ型を追加

### 4. Firestoreサービスを拡張

`src/lib/firestore.ts` にCRUD関数を追加

---

## 為替レート

- **API**: Frankfurter API (https://www.frankfurter.app/)
- **キー不要**: 無料、登録不要
- **データソース**: ECB（欧州中央銀行）公式
- **キャッシュ**: 1時間
- **フォールバック**: 取得失敗時は前回レートまたは150円/USD

---

## ライセンス

MIT
