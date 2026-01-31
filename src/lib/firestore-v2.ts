import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  collection,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Subscription,
  UserProfile,
  SharedData,
  ChildAccountInfo,
} from "@/types";
import { SHARE_CODE_LENGTH, SHARE_PERMISSION_DURATION } from "@/config/constants";

// コレクション名
const USERS_COLLECTION = "users";
const SHARED_DATA_COLLECTION = "sharedData";

// 共有コード生成（暗号学的に安全な乱数を使用）
export function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint32Array(SHARE_CODE_LENGTH);
  crypto.getRandomValues(array);
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += chars.charAt(array[i] % chars.length);
  }
  return code;
}

// ========== ユーザープロファイル ==========

// ユーザープロファイルを取得
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

// 共有コードでユーザープロファイルを検索（親アカウントのみ）
// 共有登録が許可されている場合のみ返す
export async function findParentByShareCode(
  shareCode: string
): Promise<UserProfile | null> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("shareCode", "==", shareCode),
      where("accountType", "==", "parent")
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const parentProfile = querySnapshot.docs[0].data() as UserProfile;
      
      // 共有登録が許可されているかチェック
      if (!isShareRegistrationAllowed(parentProfile)) {
        return null;
      }
      
      return parentProfile;
    }
    return null;
  } catch (error) {
    console.error("Error finding parent by share code:", error);
    throw error;
  }
}

// 共有登録が許可されているかチェック
export function isShareRegistrationAllowed(profile: UserProfile): boolean {
  if (!profile.shareAllowedUntil) {
    return false;
  }
  const allowedUntil = new Date(profile.shareAllowedUntil);
  return allowedUntil > new Date();
}

// 共有登録を許可（5分間有効）
export async function enableShareRegistration(uid: string): Promise<string> {
  const now = new Date();
  const allowedUntil = new Date(now.getTime() + SHARE_PERMISSION_DURATION);
  
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    shareAllowedUntil: allowedUntil.toISOString(),
    updatedAt: now.toISOString(),
  });
  
  return allowedUntil.toISOString();
}

// 共有登録許可を取り消し
export async function disableShareRegistration(uid: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    shareAllowedUntil: null,
    updatedAt: new Date().toISOString(),
  });
}

// 親アカウントとしてユーザープロファイルを作成
export async function createParentProfile(
  uid: string,
  email: string
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const shareCode = generateShareCode();

  const profile: UserProfile = {
    uid,
    email,
    accountType: "parent",
    shareCode,
    childUids: [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, profile);

  // 共有データも作成
  await createSharedData(shareCode, uid);

  return profile;
}

// 子アカウントとしてユーザープロファイルを作成
export async function createChildProfile(
  uid: string,
  email: string,
  parentProfile: UserProfile
): Promise<UserProfile> {
  const now = new Date().toISOString();

  const profile: UserProfile = {
    uid,
    email,
    accountType: "child",
    shareCode: parentProfile.shareCode,
    parentUid: parentProfile.uid,
    childUids: [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, profile);

  // 親のchildUidsを更新
  await addChildToParent(parentProfile.uid, uid);

  return profile;
}

// 親のchildUidsに子を追加
async function addChildToParent(parentUid: string, childUid: string): Promise<void> {
  const parentRef = doc(db, USERS_COLLECTION, parentUid);
  const parentSnap = await getDoc(parentRef);
  if (parentSnap.exists()) {
    const parent = parentSnap.data() as UserProfile;
    const updatedChildUids = [...parent.childUids, childUid];
    await updateDoc(parentRef, {
      childUids: updatedChildUids,
      updatedAt: new Date().toISOString(),
    });
  }
}

// 親のchildUidsから子を削除
async function removeChildFromParent(parentUid: string, childUid: string): Promise<void> {
  const parentRef = doc(db, USERS_COLLECTION, parentUid);
  const parentSnap = await getDoc(parentRef);
  if (parentSnap.exists()) {
    const parent = parentSnap.data() as UserProfile;
    const updatedChildUids = parent.childUids.filter((uid) => uid !== childUid);
    await updateDoc(parentRef, {
      childUids: updatedChildUids,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ユーザープロファイルを更新
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// 子アカウントの共有解除フラグをセット
export async function setShareRevokedFlag(childUid: string): Promise<void> {
  await updateUserProfile(childUid, { isShareRevoked: true });
}

// 共有解除フラグをクリア
export async function clearShareRevokedFlag(uid: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    isShareRevoked: false,
    updatedAt: new Date().toISOString(),
  });
}

// ========== 共有データ ==========

// 共有データを取得
export async function getSharedData(shareCode: string): Promise<SharedData | null> {
  try {
    const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SharedData;
    }
    return null;
  } catch (error) {
    console.error("Error getting shared data:", error);
    throw error;
  }
}

// 共有データを作成
export async function createSharedData(
  shareCode: string,
  ownerUid: string
): Promise<SharedData> {
  const now = new Date().toISOString();
  const sharedData: SharedData = {
    shareCode,
    ownerUid,
    subscriptions: [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  await setDoc(docRef, sharedData);
  return sharedData;
}

// 共有データを削除
export async function deleteSharedData(shareCode: string): Promise<void> {
  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  await deleteDoc(docRef);
}

// 共有データをリアルタイム購読
export function subscribeToSharedData(
  shareCode: string,
  callback: (data: SharedData | null) => void
): Unsubscribe {
  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SharedData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to shared data:", error);
      callback(null);
    }
  );
}

// ========== サブスクリプション操作 ==========

// サブスクリプションを追加
export async function addSubscription(
  shareCode: string,
  subscription: Subscription
): Promise<void> {
  let sharedData = await getSharedData(shareCode);
  
  // sharedDataが存在しない場合は自動作成
  if (!sharedData) {
    sharedData = await createSharedData(shareCode, shareCode); // ownerUidは後で修正される
  }

  const updatedSubscriptions = [...sharedData.subscriptions, subscription];
  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  await updateDoc(docRef, {
    subscriptions: updatedSubscriptions,
    updatedAt: new Date().toISOString(),
  });
}

// サブスクリプションを更新
export async function updateSubscription(
  shareCode: string,
  subscription: Subscription
): Promise<void> {
  const sharedData = await getSharedData(shareCode);
  if (!sharedData) throw new Error("Shared data not found");

  const updatedSubscriptions = sharedData.subscriptions.map((sub) =>
    sub.id === subscription.id ? subscription : sub
  );
  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  await updateDoc(docRef, {
    subscriptions: updatedSubscriptions,
    updatedAt: new Date().toISOString(),
  });
}

// サブスクリプションを削除
export async function deleteSubscription(
  shareCode: string,
  subscriptionId: string
): Promise<void> {
  const sharedData = await getSharedData(shareCode);
  if (!sharedData) throw new Error("Shared data not found");

  const updatedSubscriptions = sharedData.subscriptions.filter(
    (sub) => sub.id !== subscriptionId
  );
  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  await updateDoc(docRef, {
    subscriptions: updatedSubscriptions,
    updatedAt: new Date().toISOString(),
  });
}

// サブスクリプションの一時除外を切り替え
export async function toggleSubscriptionPause(
  shareCode: string,
  subscriptionId: string
): Promise<void> {
  const sharedData = await getSharedData(shareCode);
  if (!sharedData) throw new Error("Shared data not found");

  const updatedSubscriptions = sharedData.subscriptions.map((sub) =>
    sub.id === subscriptionId
      ? { ...sub, isPaused: !sub.isPaused, updatedAt: new Date().toISOString() }
      : sub
  );
  const docRef = doc(db, SHARED_DATA_COLLECTION, shareCode);
  await updateDoc(docRef, {
    subscriptions: updatedSubscriptions,
    updatedAt: new Date().toISOString(),
  });
}

// ========== 共有管理 ==========

// 子アカウント情報を取得
export async function getChildAccounts(
  childUids: string[]
): Promise<ChildAccountInfo[]> {
  const children: ChildAccountInfo[] = [];
  for (const uid of childUids) {
    const profile = await getUserProfile(uid);
    if (profile) {
      children.push({
        uid: profile.uid,
        email: profile.email,
      });
    }
  }
  return children;
}

// 親から子アカウントの共有を解除
export async function revokeChildShare(
  parentUid: string,
  childUid: string
): Promise<void> {
  // 子アカウントに解除フラグをセット
  await setShareRevokedFlag(childUid);
  // 親のchildUidsから削除
  await removeChildFromParent(parentUid, childUid);
}

// 子アカウントを親アカウントに昇格
export async function promoteToParent(uid: string): Promise<UserProfile> {
  const now = new Date().toISOString();
  const newShareCode = generateShareCode();

  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("User profile not found");

  // 元の親からchildUidsを削除（まだ削除されていない場合）
  if (profile.parentUid) {
    try {
      await removeChildFromParent(profile.parentUid, uid);
    } catch {
      // 親がすでに削除している場合は無視
    }
  }

  // 新しい共有データを作成
  await createSharedData(newShareCode, uid);

  // プロファイルを更新
  const updatedProfile: UserProfile = {
    ...profile,
    accountType: "parent",
    shareCode: newShareCode,
    parentUid: undefined,
    isShareRevoked: false,
    childUids: [],
    updatedAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), updatedProfile);
  return updatedProfile;
}

// 親アカウントを子アカウントに変更（共有に参加）
export async function demoteToChild(
  uid: string,
  parentShareCode: string
): Promise<UserProfile> {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("User profile not found");

  // 共有中の子がいないか確認
  if (profile.childUids.length > 0) {
    throw new Error("共有中の子アカウントがあります。先に解除してください。");
  }

  // 親を検索
  const parentProfile = await findParentByShareCode(parentShareCode);
  if (!parentProfile) {
    throw new Error("共有コードが見つかりません");
  }

  // 古い共有データを削除
  await deleteSharedData(profile.shareCode);

  const now = new Date().toISOString();

  // プロファイルを更新
  const updatedProfile: UserProfile = {
    ...profile,
    accountType: "child",
    shareCode: parentShareCode,
    parentUid: parentProfile.uid,
    childUids: [],
    updatedAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), updatedProfile);

  // 親のchildUidsに追加
  await addChildToParent(parentProfile.uid, uid);

  return updatedProfile;
}

// ユーザープロファイルをリアルタイム購読
export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  const docRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to user profile:", error);
      callback(null);
    }
  );
}
