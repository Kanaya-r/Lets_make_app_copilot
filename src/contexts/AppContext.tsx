"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Subscription, Toast } from "@/types";
import { STORAGE_KEYS } from "@/config/constants";
import {
  getUserData,
  createUserData,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  subscribeToUserData,
  generateShareCode,
} from "@/lib/firestore";
import { fetchExchangeRate, convertUsdToJpy } from "@/lib/exchange";

interface AppContextType {
  // 共有コード
  shareCode: string | null;
  isLoadingShareCode: boolean;
  setShareCodeAndLoad: (code: string) => Promise<boolean>;
  resetShareCode: () => void;

  // サブスクリプション
  subscriptions: Subscription[];
  isLoadingSubscriptions: boolean;
  addNewSubscription: (
    data: Omit<Subscription, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  updateExistingSubscription: (subscription: Subscription) => Promise<void>;
  deleteExistingSubscription: (id: string) => Promise<void>;

  // 為替レート
  exchangeRate: number;
  isRateError: boolean;
  isLoadingRate: boolean;
  refreshExchangeRate: () => Promise<void>;

  // 金額計算
  getAmountInJpy: (subscription: Subscription) => number;
  monthlyTotal: number;
  yearlyTotal: number;

  // トースト
  toasts: Toast[];
  showToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // 共有コード
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isLoadingShareCode, setIsLoadingShareCode] = useState(true);

  // サブスクリプション
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  // 為替レート
  const [exchangeRate, setExchangeRate] = useState(150);
  const [isRateError, setIsRateError] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  // トースト
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 為替レート取得
  const refreshExchangeRate = useCallback(async () => {
    setIsLoadingRate(true);
    const result = await fetchExchangeRate();
    setExchangeRate(result.rate);
    setIsRateError(result.isError);
    setIsLoadingRate(false);
  }, []);

  // トースト表示
  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 初期化
  useEffect(() => {
    const initializeApp = async () => {
      // 為替レート取得
      await refreshExchangeRate();

      // ローカルストレージから共有コードを取得
      const savedCode = localStorage.getItem(STORAGE_KEYS.SHARE_CODE);

      if (savedCode) {
        // 既存コードでデータを取得
        const userData = await getUserData(savedCode);
        if (userData) {
          setShareCode(savedCode);
          setSubscriptions(userData.subscriptions);
        } else {
          // データが見つからない場合は新規作成
          localStorage.removeItem(STORAGE_KEYS.SHARE_CODE);
        }
      }

      setIsLoadingShareCode(false);
    };

    initializeApp();
  }, [refreshExchangeRate]);

  // リアルタイム同期
  useEffect(() => {
    if (!shareCode) return;

    const unsubscribe = subscribeToUserData(shareCode, (data) => {
      if (data) {
        setSubscriptions(data.subscriptions);
      }
    });

    return () => unsubscribe();
  }, [shareCode]);

  // 共有コードを設定してデータを読み込む
  const setShareCodeAndLoad = async (code: string): Promise<boolean> => {
    setIsLoadingSubscriptions(true);
    try {
      console.log("Attempting to load/create data for code:", code);
      let userData = await getUserData(code);

      if (!userData) {
        // 新規作成
        console.log("No existing data, creating new user data...");
        userData = await createUserData(code);
      }

      console.log("Data loaded successfully:", userData);
      setShareCode(code);
      setSubscriptions(userData.subscriptions);
      localStorage.setItem(STORAGE_KEYS.SHARE_CODE, code);
      return true;
    } catch (error: unknown) {
      console.error("Error setting share code:", error);
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      showToast("error", `共有コードの設定に失敗しました: ${errorMessage}`);
      return false;
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  // 共有コードをリセット
  const resetShareCode = () => {
    setShareCode(null);
    setSubscriptions([]);
    localStorage.removeItem(STORAGE_KEYS.SHARE_CODE);
  };

  // サブスクリプション追加
  const addNewSubscription = async (
    data: Omit<Subscription, "id" | "createdAt" | "updatedAt">
  ) => {
    if (!shareCode) {
      // 共有コードがなければ自動生成
      const newCode = generateShareCode();
      await setShareCodeAndLoad(newCode);
    }

    const now = new Date().toISOString();
    const subscription: Subscription = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await addSubscription(shareCode!, subscription);
      showToast("success", "サブスクを登録しました");
    } catch (error) {
      console.error("Error adding subscription:", error);
      showToast("error", "登録に失敗しました");
      throw error;
    }
  };

  // サブスクリプション更新
  const updateExistingSubscription = async (subscription: Subscription) => {
    if (!shareCode) return;

    const updated = {
      ...subscription,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateSubscription(shareCode, updated);
      showToast("success", "更新しました");
    } catch (error) {
      console.error("Error updating subscription:", error);
      showToast("error", "更新に失敗しました");
      throw error;
    }
  };

  // サブスクリプション削除
  const deleteExistingSubscription = async (id: string) => {
    if (!shareCode) return;

    try {
      await deleteSubscription(shareCode, id);
      showToast("success", "削除しました");
    } catch (error) {
      console.error("Error deleting subscription:", error);
      showToast("error", "削除に失敗しました");
      throw error;
    }
  };

  // 円換算金額を取得
  const getAmountInJpy = useCallback(
    (subscription: Subscription): number => {
      if (subscription.currency === "JPY") {
        return subscription.amount;
      }
      return convertUsdToJpy(subscription.amount, exchangeRate);
    },
    [exchangeRate]
  );

  // 月額合計
  const monthlyTotal = subscriptions.reduce((total, sub) => {
    const amountInJpy = getAmountInJpy(sub);
    if (sub.planType === "monthly") {
      return total + amountInJpy;
    }
    // 年額は12で割って加算（四捨五入）
    return total + Math.round(amountInJpy / 12);
  }, 0);

  // 年額合計
  const yearlyTotal = subscriptions.reduce((total, sub) => {
    const amountInJpy = getAmountInJpy(sub);
    if (sub.planType === "yearly") {
      return total + amountInJpy;
    }
    // 月額は12倍して加算
    return total + amountInJpy * 12;
  }, 0);

  return (
    <AppContext.Provider
      value={{
        shareCode,
        isLoadingShareCode,
        setShareCodeAndLoad,
        resetShareCode,
        subscriptions,
        isLoadingSubscriptions,
        addNewSubscription,
        updateExistingSubscription,
        deleteExistingSubscription,
        exchangeRate,
        isRateError,
        isLoadingRate,
        refreshExchangeRate,
        getAmountInJpy,
        monthlyTotal,
        yearlyTotal,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
