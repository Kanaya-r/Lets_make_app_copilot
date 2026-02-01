// サブスクリプション型
export interface Subscription {
  id: string;
  name: string;
  planType: "monthly" | "yearly";
  amount: number;
  currency: "JPY" | "USD";
  isPaused?: boolean; // 一時除外フラグ
  createdAt: string;
  updatedAt: string;
}

// ジャンル定義（拡張用）
export interface Genre {
  id: string;
  name: string;
  iconName: string; // アイコン名（コンポーネント側でマッピング）
  path: string;
}

// 為替レートキャッシュ
export interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

// ユーザーアカウントタイプ
export type AccountType = "parent" | "child";

// ユーザープロファイル（Firestoreに保存）
export interface UserProfile {
  uid: string;
  email: string;
  accountType: AccountType;
  shareCode: string; // 親: 自分の共有コード, 子: 親の共有コード
  parentUid?: string; // 子アカウントの場合、親のUID
  childUids: string[]; // 親アカウントの場合、子のUIDリスト
  isShareRevoked?: boolean; // 共有が解除されたフラグ（子用）
  wasPromotedFromChild?: boolean; // 共有解除により親に昇格した通知フラグ
  shareAllowedUntil?: string; // 共有登録許可の有効期限（ISO timestamp）
  createdAt: string;
  updatedAt: string;
}

// 共有データ（サブスクリプションなど）
export interface SharedData {
  shareCode: string;
  ownerUid: string;
  subscriptions: Subscription[];
  createdAt: string;
  updatedAt: string;
}

// 子アカウント情報（共有管理用）
export interface ChildAccountInfo {
  uid: string;
  email: string;
}

// トースト通知の型
export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
