// アプリ名
export const APP_NAME = "いえログ";

// 為替レートAPI
export const EXCHANGE_RATE_API = "https://api.frankfurter.app/latest?from=USD&to=JPY";

// 為替レートキャッシュ有効期限（ミリ秒）: 1時間
export const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000;

// フォールバックレート（API取得失敗時）
export const FALLBACK_EXCHANGE_RATE = 150;

// 共有コードの長さ
export const SHARE_CODE_LENGTH = 10;

// 共有登録許可の有効期間（ミリ秒）: 5分
export const SHARE_PERMISSION_DURATION = 5 * 60 * 1000;

// 通貨オプション
export const CURRENCY_OPTIONS = [
  { value: "JPY", label: "￥" },
  { value: "USD", label: "＄" },
] as const;

// プランタイプオプション
export const PLAN_TYPE_OPTIONS = [
  { value: "monthly", label: "月額" },
  { value: "yearly", label: "年額" },
] as const;

// localStorage キー
export const STORAGE_KEYS = {
  SHARE_CODE: "ielog_share_code",
  EXCHANGE_RATE_CACHE: "ielog_exchange_rate_cache",
} as const;
