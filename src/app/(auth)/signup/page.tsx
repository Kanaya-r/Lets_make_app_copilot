"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  shareCode: z
    .string()
    .max(10, "共有コードは10文字です")
    .optional(),
});

type FormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { handleSignUp } = useAuth();
  const [formError, setFormError] = useState("");

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
      const shareCode = data.shareCode?.toUpperCase();
      await handleSignUp(
        data.email,
        data.password,
        shareCode || undefined
      );
      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("共有コード")) {
          setFormError(error.message);
        } else {
          // セキュリティのため、具体的なエラー理由は開示しない
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

          <div className={styles.field}>
            <label className={styles.label}>
              共有コード
              <span className={styles.optional}>（任意）</span>
            </label>
            <input
              type="text"
              className={`${styles.input} ${errors.shareCode ? styles.error : ""}`}
              placeholder="他の人のデータを共有する場合"
              maxLength={10}
              style={{ textTransform: "uppercase" }}
              {...register("shareCode")}
            />
            <p className={styles.hint}>
              共有コードを入力すると、そのデータを共有できます。
              <br />
              入力しない場合は新規データが作成されます。
            </p>
            {errors.shareCode && (
              <span className={styles.errorMessage}>{errors.shareCode.message}</span>
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
      </div>
    </div>
  );
}
