"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";
import {
  Subscription,
  UserProfile,
  Toast,
  ChildAccountInfo,
} from "@/types";
import { onAuthChange, signUp, logIn, logOut } from "@/lib/auth";
import {
  getUserProfile,
  createParentProfile,
  createChildProfile,
  findParentByShareCode,
  subscribeToSharedData,
  subscribeToUserProfile,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionPause,
  getChildAccounts,
  revokeChildShare,
  promoteToParent,
  demoteToChild,
  clearShareRevokedFlag,
} from "@/lib/firestore-v2";
import { fetchExchangeRate, convertUsdToJpy } from "@/lib/exchange";

interface AuthContextType {
  // 認証状態
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // 認証アクション
  handleSignUp: (email: string, password: string, shareCode?: string) => Promise<void>;
  handleLogIn: (email: string, password: string) => Promise<void>;
  handleLogOut: () => Promise<void>;

  // サブスクリプション
  subscriptions: Subscription[];
  addNewSubscription: (data: Omit<Subscription, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateExistingSubscription: (subscription: Subscription) => Promise<void>;
  deleteExistingSubscription: (id: string) => Promise<void>;
  togglePauseSubscription: (id: string) => Promise<void>;

  // 為替レート
  exchangeRate: number;
  isRateError: boolean;
  isLoadingRate: boolean;
  refreshExchangeRate: () => Promise<void>;

  // 金額計算
  getAmountInJpy: (subscription: Subscription) => number;
  monthlyTotal: number;
  yearlyTotal: number;

  // 共有管理
  childAccounts: ChildAccountInfo[];
  loadChildAccounts: () => Promise<void>;
  revokeChildAccess: (childUid: string) => Promise<void>;
  joinShare: (shareCode: string) => Promise<void>;
  leaveShare: () => Promise<void>;
  acknowledgeShareRevoked: () => Promise<void>;

  // トースト
  toasts: Toast[];
  showToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 認証状態
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // サブスクリプション
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // 為替レート
  const [exchangeRate, setExchangeRate] = useState(150);
  const [isRateError, setIsRateError] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  // 共有管理
  const [childAccounts, setChildAccounts] = useState<ChildAccountInfo[]>([]);

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

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        // ユーザープロファイルを取得
        const profile = await getUserProfile(authUser.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
        setSubscriptions([]);
      }

      setIsLoading(false);
    });

    // 為替レート取得
    refreshExchangeRate();

    return () => unsubscribe();
  }, [refreshExchangeRate]);

  // ユーザープロファイルのリアルタイム購読
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
    });

    return () => unsubscribe();
  }, [user]);

  // 共有データのリアルタイム購読
  useEffect(() => {
    if (!userProfile?.shareCode) return;

    const unsubscribe = subscribeToSharedData(userProfile.shareCode, (data) => {
      if (data) {
        setSubscriptions(data.subscriptions);
      }
    });

    return () => unsubscribe();
  }, [userProfile?.shareCode]);

  // サインアップ
  const handleSignUp = async (
    email: string,
    password: string,
    shareCode?: string
  ) => {
    try {
      const authUser = await signUp(email, password);

      let profile: UserProfile;

      if (shareCode) {
        // 共有コードが入力されている場合、子アカウントとして登録
        const parentProfile = await findParentByShareCode(shareCode);
        if (!parentProfile) {
          throw new Error("共有コードが見つかりません");
        }
        profile = await createChildProfile(authUser.uid, email, parentProfile);
      } else {
        // 共有コード未入力の場合、親アカウントとして登録
        profile = await createParentProfile(authUser.uid, email);
      }

      setUserProfile(profile);
      showToast("success", "アカウントを作成しました");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "登録に失敗しました";
      showToast("error", message);
      throw error;
    }
  };

  // ログイン
  const handleLogIn = async (email: string, password: string) => {
    try {
      const authUser = await logIn(email, password);
      const profile = await getUserProfile(authUser.uid);
      setUserProfile(profile);
      showToast("success", "ログインしました");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "ログインに失敗しました";
      showToast("error", message);
      throw error;
    }
  };

  // ログアウト
  const handleLogOut = async () => {
    try {
      await logOut();
      setUser(null);
      setUserProfile(null);
      setSubscriptions([]);
      showToast("success", "ログアウトしました");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "ログアウトに失敗しました";
      showToast("error", message);
      throw error;
    }
  };

  // サブスクリプション追加
  const addNewSubscription = async (
    data: Omit<Subscription, "id" | "createdAt" | "updatedAt">
  ) => {
    console.log("addNewSubscription called", { userProfile, shareCode: userProfile?.shareCode });
    
    if (!userProfile?.shareCode) {
      console.error("No shareCode available");
      showToast("error", "共有コードが見つかりません");
      return;
    }

    const now = new Date().toISOString();
    const subscription: Subscription = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      console.log("Adding subscription with shareCode:", userProfile.shareCode);
      await addSubscription(userProfile.shareCode, subscription);
      showToast("success", "サブスクを登録しました");
    } catch (error) {
      console.error("Error adding subscription:", error);
      showToast("error", "登録に失敗しました");
      throw error;
    }
  };

  // サブスクリプション更新
  const updateExistingSubscription = async (subscription: Subscription) => {
    if (!userProfile?.shareCode) return;

    const updated = {
      ...subscription,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateSubscription(userProfile.shareCode, updated);
      showToast("success", "更新しました");
    } catch (error) {
      console.error("Error updating subscription:", error);
      showToast("error", "更新に失敗しました");
      throw error;
    }
  };

  // サブスクリプション削除
  const deleteExistingSubscription = async (id: string) => {
    if (!userProfile?.shareCode) return;

    try {
      await deleteSubscription(userProfile.shareCode, id);
      showToast("success", "削除しました");
    } catch (error) {
      console.error("Error deleting subscription:", error);
      showToast("error", "削除に失敗しました");
      throw error;
    }
  };

  // サブスクリプション一時除外切り替え
  const togglePauseSubscription = async (id: string) => {
    if (!userProfile?.shareCode) return;

    try {
      await toggleSubscriptionPause(userProfile.shareCode, id);
    } catch (error) {
      console.error("Error toggling subscription pause:", error);
      showToast("error", "更新に失敗しました");
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

  // 月額合計（一時除外を除く）
  const monthlyTotal = subscriptions.reduce((total, sub) => {
    if (sub.isPaused) return total; // 一時除外は計算から除外
    const amountInJpy = getAmountInJpy(sub);
    if (sub.planType === "monthly") {
      return total + amountInJpy;
    }
    return total + Math.round(amountInJpy / 12);
  }, 0);

  // 年額合計（一時除外を除く）
  const yearlyTotal = subscriptions.reduce((total, sub) => {
    if (sub.isPaused) return total; // 一時除外は計算から除外
    const amountInJpy = getAmountInJpy(sub);
    if (sub.planType === "yearly") {
      return total + amountInJpy;
    }
    return total + amountInJpy * 12;
  }, 0);

  // 子アカウント一覧を取得
  const loadChildAccounts = async () => {
    if (!userProfile || userProfile.accountType !== "parent") return;

    try {
      const children = await getChildAccounts(userProfile.childUids);
      setChildAccounts(children);
    } catch (error) {
      console.error("Error loading child accounts:", error);
    }
  };

  // 子アカウントの共有を解除
  const revokeChildAccess = async (childUid: string) => {
    if (!userProfile) return;

    try {
      await revokeChildShare(userProfile.uid, childUid);
      await loadChildAccounts();
      showToast("success", "共有を解除しました");
    } catch (error) {
      console.error("Error revoking child access:", error);
      showToast("error", "解除に失敗しました");
      throw error;
    }
  };

  // 共有に参加（親→子に変更）
  const joinShare = async (shareCode: string) => {
    if (!userProfile) return;

    try {
      const updatedProfile = await demoteToChild(userProfile.uid, shareCode);
      setUserProfile(updatedProfile);
      showToast("success", "共有に参加しました");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "参加に失敗しました";
      showToast("error", message);
      throw error;
    }
  };

  // 共有から離脱（子→親に昇格）
  const leaveShare = async () => {
    if (!userProfile) return;

    try {
      const updatedProfile = await promoteToParent(userProfile.uid);
      setUserProfile(updatedProfile);
      showToast("success", "共有を解除しました");
    } catch (error) {
      console.error("Error leaving share:", error);
      showToast("error", "解除に失敗しました");
      throw error;
    }
  };

  // 共有解除を確認
  const acknowledgeShareRevoked = async () => {
    if (!userProfile) return;

    try {
      const updatedProfile = await promoteToParent(userProfile.uid);
      await clearShareRevokedFlag(userProfile.uid);
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error("Error acknowledging share revoked:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isAuthenticated: !!user && !!userProfile,
        handleSignUp,
        handleLogIn,
        handleLogOut,
        subscriptions,
        addNewSubscription,
        updateExistingSubscription,
        deleteExistingSubscription,
        togglePauseSubscription,
        exchangeRate,
        isRateError,
        isLoadingRate,
        refreshExchangeRate,
        getAmountInJpy,
        monthlyTotal,
        yearlyTotal,
        childAccounts,
        loadChildAccounts,
        revokeChildAccess,
        joinShare,
        leaveShare,
        acknowledgeShareRevoked,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
