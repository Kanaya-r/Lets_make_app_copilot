import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
  sendPasswordResetEmail,
  ActionCodeSettings,
  reload,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

function getEmailVerificationSettings(): ActionCodeSettings {
  const fallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login/`
      : "http://localhost:3000/login/";

  return {
    url: process.env.NEXT_PUBLIC_EMAIL_VERIFY_REDIRECT_URL || fallbackUrl,
    handleCodeInApp: true,
  };
}

// サインアップ
export async function signUp(
  email: string,
  password: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

// メール認証リンクを送信
export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user, getEmailVerificationSettings());
}

// ログイン
export async function logIn(
  email: string,
  password: string
): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

// メール認証状態を最新化
export async function reloadUser(user: User): Promise<void> {
  await reload(user);
}

// メール認証のアクションコードを適用
export async function verifyEmailWithCode(oobCode: string): Promise<void> {
  await applyActionCode(auth, oobCode);
}

// ログアウト
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// 認証状態の監視
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// 現在のユーザーを取得
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// パスワードリセットコードの検証
export async function verifyResetCode(actionCode: string): Promise<string> {
  return await verifyPasswordResetCode(auth, actionCode);
}

// パスワードリセットの確定
export async function confirmResetPassword(
  actionCode: string,
  newPassword: string
): Promise<void> {
  await confirmPasswordReset(auth, actionCode, newPassword);
}

// メールアドレス変更の取り消し
export async function recoverEmail(actionCode: string): Promise<string> {
  const info = await checkActionCode(auth, actionCode);
  await applyActionCode(auth, actionCode);
  const restoredEmail = info.data.email;
  if (restoredEmail) {
    await sendPasswordResetEmail(auth, restoredEmail);
  }
  return restoredEmail || "";
}
