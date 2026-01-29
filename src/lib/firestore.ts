import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { Subscription, UserData } from "@/types";
import { SHARE_CODE_LENGTH } from "@/config/constants";

// 共有コード生成
export function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字を除外
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// コレクション名
const COLLECTION_NAME = "users";

// ユーザーデータを取得
export async function getUserData(shareCode: string): Promise<UserData | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, shareCode);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error; // エラーを上位に伝播
  }
}

// 新規ユーザーデータを作成
export async function createUserData(shareCode: string): Promise<UserData> {
  const now = new Date().toISOString();
  const userData: UserData = {
    shareCode,
    subscriptions: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    console.log("Creating user data for:", shareCode);
    const docRef = doc(db, COLLECTION_NAME, shareCode);
    await setDoc(docRef, userData);
    console.log("User data created successfully");
    return userData;
  } catch (error) {
    console.error("Error creating user data:", error);
    throw error;
  }
}

// サブスクリプションを追加
export async function addSubscription(
  shareCode: string,
  subscription: Subscription
): Promise<void> {
  try {
    const userData = await getUserData(shareCode);
    if (!userData) throw new Error("User data not found");

    const updatedSubscriptions = [...userData.subscriptions, subscription];
    const docRef = doc(db, COLLECTION_NAME, shareCode);
    await updateDoc(docRef, {
      subscriptions: updatedSubscriptions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error adding subscription:", error);
    throw error;
  }
}

// サブスクリプションを更新
export async function updateSubscription(
  shareCode: string,
  subscription: Subscription
): Promise<void> {
  try {
    const userData = await getUserData(shareCode);
    if (!userData) throw new Error("User data not found");

    const updatedSubscriptions = userData.subscriptions.map((sub) =>
      sub.id === subscription.id ? subscription : sub
    );
    const docRef = doc(db, COLLECTION_NAME, shareCode);
    await updateDoc(docRef, {
      subscriptions: updatedSubscriptions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

// サブスクリプションを削除
export async function deleteSubscription(
  shareCode: string,
  subscriptionId: string
): Promise<void> {
  try {
    const userData = await getUserData(shareCode);
    if (!userData) throw new Error("User data not found");

    const updatedSubscriptions = userData.subscriptions.filter(
      (sub) => sub.id !== subscriptionId
    );
    const docRef = doc(db, COLLECTION_NAME, shareCode);
    await updateDoc(docRef, {
      subscriptions: updatedSubscriptions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    throw error;
  }
}

// リアルタイム購読
export function subscribeToUserData(
  shareCode: string,
  callback: (data: UserData | null) => void
): Unsubscribe {
  const docRef = doc(db, COLLECTION_NAME, shareCode);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to user data:", error);
      callback(null);
    }
  );
}
