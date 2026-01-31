import {
  EXCHANGE_RATE_API,
  EXCHANGE_RATE_CACHE_DURATION,
  FALLBACK_EXCHANGE_RATE,
  STORAGE_KEYS,
} from "@/config/constants";
import { ExchangeRateCache } from "@/types";

// キャッシュからレートを取得
function getCachedRate(): ExchangeRateCache | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE_CACHE);
    if (!cached) return null;

    const data: ExchangeRateCache = JSON.parse(cached);
    const now = Date.now();

    // キャッシュが有効期限内かチェック
    if (now - data.timestamp < EXCHANGE_RATE_CACHE_DURATION) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

// キャッシュにレートを保存
function setCachedRate(rate: number): void {
  if (typeof window === "undefined") return;

  const data: ExchangeRateCache = {
    rate,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE_CACHE, JSON.stringify(data));
}

// 為替レートを取得（USD→JPY）
export async function fetchExchangeRate(): Promise<{
  rate: number;
  isError: boolean;
  isCached: boolean;
}> {
  // まずキャッシュをチェック
  const cached = getCachedRate();
  if (cached) {
    return {
      rate: cached.rate,
      isError: false,
      isCached: true,
    };
  }

  // APIから取得
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();
    const rate = data.rates?.JPY;

    if (typeof rate !== "number") {
      throw new Error("Invalid rate data");
    }

    // キャッシュに保存
    setCachedRate(rate);

    return {
      rate,
      isError: false,
      isCached: false,
    };
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);

    // 以前のキャッシュがあれば（期限切れでも）使用
    const expiredCache = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE_CACHE);
    if (expiredCache) {
      try {
        const data: ExchangeRateCache = JSON.parse(expiredCache);
        return {
          rate: data.rate,
          isError: true,
          isCached: true,
        };
      } catch {
        // パースエラー
      }
    }

    // フォールバックレートを返す
    return {
      rate: FALLBACK_EXCHANGE_RATE,
      isError: true,
      isCached: false,
    };
  }
}

// USD金額を日本円に換算
export function convertUsdToJpy(usdAmount: number, rate: number): number {
  return Math.round(usdAmount * rate);
}

// 金額をフォーマット（日本円表示）
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
