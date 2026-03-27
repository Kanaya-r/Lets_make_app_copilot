"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HiHome } from "react-icons/hi";
import {
  verifyEmailWithCode,
  verifyResetCode,
  confirmResetPassword,
  recoverEmail,
} from "@/lib/auth";
import { APP_NAME } from "@/config/constants";
import styles from "@/styles/auth.module.scss";

type ActionMode = "verifyEmail" | "resetPassword" | "recoverEmail";
type Status = "processing" | "success" | "error" | "input";

const passwordSchema = z.object({
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  confirmPassword: z.string().min(1, "パスワードを再入力してください"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function EmailActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as ActionMode | null;
  const actionCode = searchParams.get("oobCode") || "";

  const isInvalidParams = !mode || !actionCode;

  const [status, setStatus] = useState<Status>(
    isInvalidParams ? "error" : "processing"
  );
  const [errorMessage, setErrorMessage] = useState(
    isInvalidParams ? "無効なリンクです。" : ""
  );
  const [accountEmail, setAccountEmail] = useState("");
  const hasProcessed = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // モードに応じた初期処理
  useEffect(() => {
    if (isInvalidParams || hasProcessed.current) return;
    hasProcessed.current = true;

    const processAction = async () => {
      switch (mode) {
        case "verifyEmail":
          try {
            await verifyEmailWithCode(actionCode);
            setStatus("success");
            setTimeout(() => router.push("/login?emailVerified=true"), 2000);
          } catch {
            setStatus("error");
            setErrorMessage("メール認証に失敗しました。リンクの有効期限が切れている可能性があります。");
          }
          break;

        case "recoverEmail":
          try {
            const restoredEmail = await recoverEmail(actionCode);
            setAccountEmail(restoredEmail);
            setStatus("success");
            setTimeout(() => router.push("/login?emailRecovered=true"), 3000);
          } catch {
            setStatus("error");
            setErrorMessage("メールアドレスの復旧に失敗しました。リンクの有効期限が切れている可能性があります。");
          }
          break;

        case "resetPassword":
          try {
            const email = await verifyResetCode(actionCode);
            setAccountEmail(email);
            setStatus("input");
          } catch {
            setStatus("error");
            setErrorMessage("パスワードリセットリンクが無効または期限切れです。もう一度リセットをリクエストしてください。");
          }
          break;

        default:
          setStatus("error");
          setErrorMessage("無効なアクションです。");
      }
    };

    processAction();
  }, [isInvalidParams, mode, actionCode, router]);

  // パスワードリセットの確定
  const onSubmitPassword = async (data: PasswordFormData) => {
    try {
      await confirmResetPassword(actionCode, data.password);
      setStatus("success");
      setTimeout(() => {
        router.push("/login?passwordReset=true");
      }, 2000);
    } catch {
      setStatus("error");
      setErrorMessage(
        "パスワードのリセットに失敗しました。もう一度リセットをリクエストしてください。"
      );
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "verifyEmail":
        return "メール認証";
      case "resetPassword":
        return "パスワードリセット";
      case "recoverEmail":
        return "メールアドレスの復旧";
      default:
        return "メールアクション";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logo}><HiHome /></div>
      <h1 className={styles.title}>{APP_NAME}</h1>
      <p className={styles.subtitle}>{getTitle()}</p>

      <div className={styles.card}>
        {/* 処理中 */}
        {status === "processing" && (
          <div className={styles.formSuccess}>処理中...</div>
        )}

        {/* エラー */}
        {status === "error" && (
          <>
            <div className={styles.formError}>{errorMessage}</div>
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={() => router.push("/login")}
            >
              ログイン画面へ
            </button>
          </>
        )}

        {/* メール認証・メール復旧の成功 */}
        {status === "success" && mode === "verifyEmail" && (
          <div className={styles.formSuccess}>
            メール認証が完了しました。ログイン画面へ移動します...
          </div>
        )}
        {status === "success" && mode === "recoverEmail" && (
          <div className={styles.formSuccess}>
            メールアドレスが {accountEmail} に復旧されました。
            <br />
            セキュリティのため、パスワードリセットメールも送信しました。
            <br />
            ログイン画面へ移動します...
          </div>
        )}
        {status === "success" && mode === "resetPassword" && (
          <div className={styles.formSuccess}>
            パスワードをリセットしました。ログイン画面へ移動します...
          </div>
        )}

        {/* パスワードリセットフォーム */}
        {status === "input" && mode === "resetPassword" && (
          <>
            <p className={styles.formSuccess}>
              {accountEmail} のパスワードを再設定します。
            </p>
            <form className={styles.form} onSubmit={handleSubmit(onSubmitPassword)}>
              <div className={styles.field}>
                <label className={styles.label}>
                  新しいパスワード<span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.error : ""}`}
                  placeholder="8文字以上のパスワード"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <span className={styles.errorMessage}>{errors.password.message}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  パスワード確認<span className={styles.required}>*</span>
                </label>
                <input
                  type="password"
                  className={`${styles.input} ${errors.confirmPassword ? styles.error : ""}`}
                  placeholder="パスワードを再入力"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <span className={styles.errorMessage}>{errors.confirmPassword.message}</span>
                )}
              </div>

              <button
                type="submit"
                className={`${styles.button} ${styles.primaryButton}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "リセット中..." : "パスワードをリセット"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
