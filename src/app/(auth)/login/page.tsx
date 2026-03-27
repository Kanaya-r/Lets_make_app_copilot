"use client";

import { useState } from "react";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HiHome } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/config/constants";
import styles from "@/styles/auth.module.scss";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(1, "パスワードを入力してください"),
});

type FormData = z.infer<typeof loginSchema>;

function getSuccessMessage(searchParams: ReadonlyURLSearchParams): string | null {
  if (searchParams.get("emailVerified") === "true") {
    return "メール認証が完了しました。メールアドレスとパスワードでログインしてください。";
  }
  if (searchParams.get("passwordReset") === "true") {
    return "パスワードをリセットしました。新しいパスワードでログインしてください。";
  }
  if (searchParams.get("emailRecovered") === "true") {
    return "メールアドレスが復旧されました。ログインしてください。";
  }
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleLogIn } = useAuth();
  const [formError, setFormError] = useState("");
  const successMessage = getSuccessMessage(searchParams);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: FormData) => {
    setFormError("");
    try {
      await handleLogIn(data.email, data.password);
      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          error.message.includes("user-not-found") ||
          error.message.includes("wrong-password") ||
          error.message.includes("invalid-credential")
        ) {
          setFormError("メールアドレスまたはパスワードが正しくありません");
        } else if (error.message.includes("email-not-verified")) {
          setFormError("メール認証が完了していません。確認メールのリンクを開いてからログインしてください。");
        } else {
          setFormError("ログインに失敗しました。もう一度お試しください。");
        }
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logo}><HiHome /></div>
      <h1 className={styles.title}>{APP_NAME}</h1>
      <p className={styles.subtitle}>ログイン</p>

      <div className={styles.card}>
        {successMessage && (
          <div className={styles.formSuccess}>
            {successMessage}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
          {formError && <div className={styles.formError}>{formError}</div>}

          <div className={styles.field}>
            <label className={styles.label}>
              メールアドレス<span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              className={`${styles.input} ${errors.email ? styles.error : ""}`}
              placeholder="example@email.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <span className={styles.errorMessage}>{errors.email.message}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              パスワード<span className={styles.required}>*</span>
            </label>
            <input
              type="password"
              className={`${styles.input} ${errors.password ? styles.error : ""}`}
              placeholder="パスワード"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <span className={styles.errorMessage}>{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            className={`${styles.button} ${styles.primaryButton}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <p className={styles.linkText}>
          アカウントをお持ちでない方は
          <Link href="/signup">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
