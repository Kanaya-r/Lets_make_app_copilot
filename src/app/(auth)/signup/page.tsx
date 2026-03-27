"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HiHome } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@/config/constants";
import styles from "@/styles/auth.module.scss";

const signupSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(6, "パスワードは6文字以上で入力してください"),
});

type FormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { handleSignUp } = useAuth();
  const [formError, setFormError] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: FormData) => {
    setFormError("");
    try {
      await handleSignUp(data.email, data.password);
      setVerificationEmail(data.email);
      setIsVerificationSent(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("email-already-in-use")) {
          setFormError("このメールアドレスはすでに登録されています。");
        } else {
          // セキュリティのため、詳細は開示しない
          setFormError("登録に失敗しました。もう一度お試しください。");
        }
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logo}><HiHome /></div>
      <h1 className={styles.title}>{APP_NAME}</h1>
      <p className={styles.subtitle}>アカウントを作成</p>

      <div className={styles.card}>
        {isVerificationSent ? (
          <>
            <div className={styles.formSuccess}>
              確認メールを送信しました。
              <br />
              送信先: {verificationEmail}
              <br />
              メール内のURLから認証を完了した後、ログインしてください。
            </div>
            <p className={styles.linkText}>
              認証完了後は
              <Link href="/login">ログイン画面へ</Link>
            </p>
          </>
        ) : (
          <>
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
                  placeholder="6文字以上"
                  autoComplete="new-password"
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
                {isSubmitting ? "作成中..." : "アカウントを作成"}
              </button>
            </form>

            <div className={styles.divider}>
              <span>または</span>
            </div>

            <p className={styles.linkText}>
              すでにアカウントをお持ちの方は
              <Link href="/login">ログイン</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
