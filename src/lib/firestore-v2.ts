import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "./firebase";
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
const SHARE_INVITES_COLLECTION = "shareInvites";

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
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    // 他ユーザーのプロフィール参照時に permission-denied が返るケースは null 扱いにする
    if (errorCode === "permission-denied" && auth.currentUser?.uid !== uid) {
      return null;
    }
    console.error("Error getting user profile:", error);
    throw error;
  }
}

// 共有招待の情報（shareInvitesコレクションから取得）
interface ShareInviteInfo {
  ownerUid: string;
  shareCode: string;
}

type InviteRaw = {
  ownerUid?: string;
  shareCode?: string;
  enabledUntil?: Timestamp | string;
};

function isInviteEnabled(enabledUntil: Timestamp | string): boolean {
  if (enabledUntil instanceof Timestamp) {
    return enabledUntil.toMillis() > Date.now();
  }

  const until = new Date(enabledUntil);
  if (isNaN(until.getTime())) {
    return false;
  }
  return until.getTime() > Date.now();
}

// 共有コードで有効な招待情報を取得
// usersコレクションのlistは使わず、shareInvitesの単一ドキュメント取得のみ
export async function findShareInvite(
  shareCode: string
): Promise<ShareInviteInfo | null> {
  try {
    const inviteRef = doc(db, SHARE_INVITES_COLLECTION, shareCode);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      return null;
    }

    const invite = inviteSnap.data() as InviteRaw;

    if (
      typeof invite.ownerUid !== "string" ||
      !(invite.enabledUntil instanceof Timestamp) && typeof invite.enabledUntil !== "string"
    ) {
      return null;
    }

    // 二重チェック（ルールでも期限チェックするが、クライアント側でも整合性を担保）
    if (!isInviteEnabled(invite.enabledUntil)) {
      return null;
    }

    return {
      ownerUid: invite.ownerUid,
      shareCode,
    };
  } catch (error) {
    console.error("Error finding share invite:", error);
    throw error;
  }
}

// 共有登録が許可されているかチェック
export function isShareRegistrationAllowed(profile: UserProfile): boolean {
  if (!profile.shareAllowedUntil) {
    return false;
  }
  const allowedUntil = new Date(profile.shareAllowedUntil);
  // 無効な日付文字列の場合は共有登録を許可しない
  if (isNaN(allowedUntil.getTime())) {
    return false;
  }
  return allowedUntil.getTime() > Date.now();
}

// 共有登録を許可（5分間有効）
export async function enableShareRegistration(uid: string): Promise<string> {
  const profile = await getUserProfile(uid);
  if (!profile) {
    throw new Error("User profile not found");
  }

  const now = new Date();
  const allowedUntil = new Date(now.getTime() + SHARE_PERMISSION_DURATION);
  const nowIso = now.toISOString();
  const allowedUntilIso = allowedUntil.toISOString();
  
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    shareAllowedUntil: allowedUntilIso,
    updatedAt: nowIso,
  });

  const inviteRef = doc(db, SHARE_INVITES_COLLECTION, profile.shareCode);
  await setDoc(inviteRef, {
    shareCode: profile.shareCode,
    ownerUid: uid,
    enabledUntil: Timestamp.fromDate(allowedUntil),
    updatedAt: nowIso,
    createdAt: nowIso,
  });
  
  return allowedUntilIso;
}

// 共有登録許可を取り消し
export async function disableShareRegistration(uid: string): Promise<void> {
  const profile = await getUserProfile(uid);
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    shareAllowedUntil: null,
    updatedAt: new Date().toISOString(),
  });

  if (profile?.shareCode) {
    const inviteRef = doc(db, SHARE_INVITES_COLLECTION, profile.shareCode);
    await deleteDoc(inviteRef);
  }
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

// 親のchildUidsに子を追加（arrayUnionで親ドキュメントの事前読み取り不要）
async function addChildToParent(parentUid: string, childUid: string): Promise<void> {
  const parentRef = doc(db, USERS_COLLECTION, parentUid);
  await updateDoc(parentRef, {
    childUids: arrayUnion(childUid),
    updatedAt: new Date().toISOString(),
  });
}

// 親のchildUidsから子を削除（arrayRemoveで親ドキュメントの事前読み取り不要）
async function removeChildFromParent(parentUid: string, childUid: string): Promise<void> {
  const parentRef = doc(db, USERS_COLLECTION, parentUid);
  await updateDoc(parentRef, {
    childUids: arrayRemove(childUid),
    updatedAt: new Date().toISOString(),
  });
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

// 昇格通知フラグをクリア
export async function clearPromotionNotification(uid: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    wasPromotedFromChild: deleteField(),
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
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      // 認証切替直後の一時的な permission-denied は無害なためノイズを抑える
      if (errorCode !== "permission-denied") {
        console.error("Error subscribing to shared data:", error);
      }
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
export async function promoteToParent(uid: string, showNotification = false): Promise<UserProfile> {
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
    isShareRevoked: undefined,
    wasPromotedFromChild: showNotification ? true : undefined,
    childUids: [],
    updatedAt: now,
  };

  // Firestoreには parentUid と isShareRevoked を削除して保存（undefinedはサポートされない）
  // showNotificationがtrueの場合はwasPromotedFromChildをtrueに設定
  const updateData: Record<string, unknown> = {
    accountType: "parent",
    shareCode: newShareCode,
    parentUid: deleteField(),
    isShareRevoked: deleteField(),
    childUids: [],
    updatedAt: now,
  };
  
  if (showNotification) {
    updateData.wasPromotedFromChild = true;
  }
  
  await updateDoc(doc(db, USERS_COLLECTION, uid), updateData);
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

  // 共有招待を検索（shareInvitesから取得、親のusersドキュメントは読まない）
  const invite = await findShareInvite(parentShareCode);
  if (!invite) {
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
    parentUid: invite.ownerUid,
    childUids: [],
    updatedAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), updatedProfile);

  // 親のchildUidsに追加
  await addChildToParent(invite.ownerUid, uid);

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
