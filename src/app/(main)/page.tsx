"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { formatCurrency } from "@/lib/exchange";
import styles from "./page.module.scss";

export default function TopPage() {
  const {
    subscriptions,
    monthlyTotal,
    yearlyTotal,
    exchangeRate,
    isRateError,
    isLoadingRate,
    refreshExchangeRate,
  } = useAuth();

  const hasSubscriptions = subscriptions.length > 0;

  return (
    <div className={styles.page}>
      <Header />

      {/* サブスクセクション */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💳</span>
            サブスク
          </h2>
          <Link href="/subscriptions" className={styles.viewAllLink}>
            詳細 →
          </Link>
        </div>

        {isLoadingRate ? (
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonGrid}>
              <div className={`${styles.skeletonItem} skeleton`} />
              <div className={`${styles.skeletonItem} skeleton`} />
            </div>
          </div>
        ) : hasSubscriptions ? (
          <div className={styles.summaryCard}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>今月の支払い</div>
                <div className={`${styles.summaryValue} ${styles.highlight}`}>
                  {formatCurrency(monthlyTotal)}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>年間の支払い</div>
                <div className={styles.summaryValue}>
                  {formatCurrency(yearlyTotal)}
                </div>
              </div>
            </div>

            <div className={styles.rateInfo}>
              <div className={styles.rateValue}>
                <span>為替レート: $1 = ¥{exchangeRate.toFixed(2)}</span>
                {isRateError && (
                  <span className={styles.rateError}>（取得失敗）</span>
                )}
              </div>
              <button
                className={styles.refreshButton}
                onClick={refreshExchangeRate}
                disabled={isLoadingRate}
              >
                更新
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <h3 className={styles.emptyTitle}>サブスクを登録しましょう</h3>
            <p className={styles.emptyDescription}>
              利用中のサブスクリプションを登録して
              <br />
              月々の支払いを把握しましょう
            </p>
            <Link href="/subscriptions" className={styles.emptyButton}>
              <span>+</span>
              サブスクを登録
            </Link>
          </div>
        )}
      </section>

      {/* 将来の拡張用プレースホルダー */}
      {/* 
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔌</span>
            家電メンテナンス
          </h2>
        </div>
        <div className={styles.summaryCard}>
          <p>Coming soon...</p>
        </div>
      </section>
      */}
    </div>
  );
}
