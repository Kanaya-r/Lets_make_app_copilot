// サブスクリプション型
export interface Subscription {
  id: string;
  name: string;
  planType: "monthly" | "yearly";
  amount: number;
  currency: "JPY" | "USD";
  createdAt: string;
  updatedAt: string;
}

// ジャンル定義（拡張用）
export interface Genre {
  id: string;
  name: string;
  icon: string;
  path: string;
}

// 為替レートキャッシュ
export interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

// 共有コード用データ構造
export interface UserData {
  shareCode: string;
  subscriptions: Subscription[];
  createdAt: string;
  updatedAt: string;
}

// トースト通知の型
export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
