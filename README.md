# Lets_make_app_copilot
全部Copilotに作らせる。

# いえログ 🏠

家庭のあれこれを整理・把握できるアプリです。まずは「サブスク管理」から。

## 機能

### MVP実装済み
- ✅ サブスク管理（CRUD）
- ✅ 月額/年額の合計表示
- ✅ USD→JPYリアルタイム換算（Frankfurter API）
- ✅ 端末間データ同期（Firebase Firestore）
- ✅ **メール認証（Firebase Authentication）**
- ✅ **親子アカウント共有モデル**
  - オーナー（親）：共有コードを発行、子アカウントを管理
  - メンバー（子）：共有コードでオーナーのデータに参加
- ✅ スマホファーストUI（下部ナビ、FAB）
- ✅ PWA対応

### 今後の拡張予定
- 家電メンテナンス管理
- その他のジャンル追加

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16.1.6 (App Router) |
| 言語 | TypeScript 5 |
| スタイリング | SCSS (CSS Modules) |
| フォーム | React Hook Form 7 + Zod 4 |
| 状態管理 | React 19 Context |
| 認証 | Firebase Authentication |
| データベース | Firebase Firestore |
| 為替API | Frankfurter API (ECB公式、キー不要) |
| デプロイ | git-ftp |

---

## セットアップ手順

### 1. パッケージインストール

```bash
npm install
```

### 2. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. **Authentication を有効化**（メール/パスワード認証を有効にする）
3. **Firestore を有効化**
4. `.env.local.example` をコピーして `.env.local` を作成
5. Firebase設定値を記入

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Firestoreセキュリティルール

プロジェクトに含まれる `firestore.rules` をFirebase Consoleでデプロイするか、内容をコピーして設定してください。

主な機能:
- ユーザープロファイルの読み書き制御
- 親子アカウント間のアクセス管理
- 共有コードベースのデータアクセス
- 共有登録の時限許可（5分間）

詳細は [firestore.rules](firestore.rules) を参照してください。

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

---

## デプロイ手順

git-ftpを使用した自動デプロイに対応しています。詳細は [docs/GIT-FTP-DEPLOY.md](docs/GIT-FTP-DEPLOY.md) を参照してください。

### 初回セットアップ

```bash
# git-ftpインストール（macOS）
brew install git-ftp

# FTP設定ファイル作成
cp .git-ftp-config.example .git-ftp-config
# .git-ftp-config を編集してFTP接続情報を設定

# 初回デプロイ
npm run deploy:init
```

### 通常デプロイ

```bash
# mainブランチでビルド＆デプロイ
npm run deploy
```

`out/` ディレクトリに静的ファイルが生成され、git-ftpでサーバーにアップロードされます。

---

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証画面グループ
│   │   ├── layout.tsx     # 認証レイアウト
│   │   ├── login/
│   │   │   └── page.tsx   # ログイン画面
│   │   └── signup/
│   │       └── page.tsx   # サインアップ画面
│   ├── (main)/            # メインレイアウトグループ
│   │   ├── layout.tsx     # メインレイアウト
│   │   ├── page.tsx       # TOP画面
│   │   ├── settings/
│   │   │   └── page.tsx   # 設定画面
│   │   └── subscriptions/
│   │       └── page.tsx   # サブスク管理画面
│   └── layout.tsx         # ルートレイアウト
├── components/            # UIコンポーネント
│   ├── ConfirmDialog/
│   ├── Header/
│   ├── Modal/
│   ├── Navigation/
│   ├── SubscriptionForm/
│   └── Toast/
├── config/                # 設定ファイル
│   ├── constants.ts       # 定数
│   └── genres.ts          # ジャンル定義（拡張用）
├── contexts/              # React Context
│   └── AuthContext.tsx    # 認証・アプリ状態管理
├── lib/                   # ユーティリティ
│   ├── auth.ts            # Firebase Auth操作
│   ├── exchange.ts        # 為替レート取得
│   ├── firebase.ts        # Firebase設定
│   └── firestore-v2.ts    # Firestoreデータ操作
├── styles/                # グローバルスタイル
│   ├── _variables.scss    # SCSS変数
│   ├── _reset.scss        # リセットCSS
│   ├── auth.module.scss   # 認証画面スタイル
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
    iconName: "creditCard",
    path: "/subscriptions",
  },
  // 新規追加
  {
    id: "appliances",
    name: "家電",
    iconName: "plug",
    path: "/appliances",
  },
];
```

### 2. ページを作成

`src/app/(main)/appliances/page.tsx` を作成

### 3. 型定義を追加

`src/types/index.ts` に新しいデータ型を追加

### 4. Firestoreサービスを拡張

`src/lib/firestore-v2.ts` にCRUD関数を追加

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
