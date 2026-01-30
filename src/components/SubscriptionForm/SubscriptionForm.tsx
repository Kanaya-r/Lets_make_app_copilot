"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Subscription } from "@/types";
import { CURRENCY_OPTIONS, PLAN_TYPE_OPTIONS } from "@/config/constants";
import styles from "./SubscriptionForm.module.scss";

// バリデーションスキーマ
const subscriptionSchema = z.object({
  name: z
    .string()
    .min(1, "サブスク名を入力してください")
    .max(50, "50文字以内で入力してください"),
  planType: z.enum(["monthly", "yearly"]),
  amount: z
    .number({ message: "金額を入力してください" })
    .positive("0より大きい値を入力してください")
    .max(10000000, "金額が大きすぎます"),
  currency: z.enum(["JPY", "USD"]),
});

type FormData = z.infer<typeof subscriptionSchema>;

interface SubscriptionFormProps {
  subscription?: Subscription | null;
  onClose: () => void;
}

export function SubscriptionForm({
  subscription,
  onClose,
}: SubscriptionFormProps) {
  const { addNewSubscription, updateExistingSubscription } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: subscription?.name || "",
      planType: subscription?.planType || "monthly",
      amount: subscription?.amount || undefined,
      currency: subscription?.currency || "JPY",
    },
  });

  const planType = watch("planType");
  const currency = watch("currency");

  const onSubmit = async (data: FormData) => {
    try {
      if (subscription) {
        // 編集
        await updateExistingSubscription({
          ...subscription,
          ...data,
        });
      } else {
        // 新規登録
        await addNewSubscription(data);
      }
      onClose();
    } catch (error) {
      console.error("Error saving subscription:", error);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      {/* サブスク名 */}
      <div className={styles.field}>
        <label className={styles.label}>
          サブスク名<span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          className={`${styles.input} ${errors.name ? styles.error : ""}`}
          placeholder="例: Netflix、Spotify"
          {...register("name")}
        />
        {errors.name && (
          <span className={styles.errorMessage}>{errors.name.message}</span>
        )}
      </div>

      {/* 支払いタイプ */}
      <div className={styles.field}>
        <label className={styles.label}>
          支払いタイプ<span className={styles.required}>*</span>
        </label>
        <div className={styles.segmentedControl}>
          {PLAN_TYPE_OPTIONS.map((option) => (
            <div key={option.value} className={styles.segmentOption}>
              <input
                type="radio"
                id={`planType-${option.value}`}
                value={option.value}
                className={styles.segmentInput}
                {...register("planType")}
                defaultChecked={planType === option.value}
              />
              <label
                htmlFor={`planType-${option.value}`}
                className={styles.segmentLabel}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 金額と通貨 */}
      <div className={styles.field}>
        <label className={styles.label}>
          金額<span className={styles.required}>*</span>
        </label>
        <div className={styles.amountRow}>
          <div className={styles.amountInput}>
            <input
              type="number"
              inputMode="numeric"
              className={`${styles.input} ${errors.amount ? styles.error : ""}`}
              placeholder={currency === "JPY" ? "例: 1490" : "例: 9.99"}
              step={currency === "JPY" ? "1" : "0.01"}
              {...register("amount", { valueAsNumber: true })}
            />
          </div>
          <div className={styles.currencySelect}>
            <select className={styles.select} {...register("currency")}>
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {errors.amount && (
          <span className={styles.errorMessage}>{errors.amount.message}</span>
        )}
      </div>

      {/* ボタン */}
      <div className={styles.buttons}>
        <button
          type="button"
          className={`${styles.button} ${styles.cancelButton}`}
          onClick={onClose}
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className={`${styles.button} ${styles.submitButton}`}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "保存中..."
            : subscription
            ? "保存"
            : "登録"}
        </button>
      </div>
    </form>
  );
}
