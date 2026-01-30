"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { formatCurrency } from "@/lib/exchange";
import { Subscription } from "@/types";
import styles from "./page.module.scss";

export default function SubscriptionsPage() {
  const {
    subscriptions,
    monthlyTotal,
    yearlyTotal,
    getAmountInJpy,
    deleteExistingSubscription,
    isLoadingRate,
  } = useAuth();

  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null);

  // 削除確認ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  // メニュー状態
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenModal = (subscription?: Subscription) => {
    setEditingSubscription(subscription || null);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubscription(null);
  };

  const handleDelete = (subscription: Subscription) => {
    setDeleteTarget(subscription);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deleteExistingSubscription(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const getPlanTypeLabel = (planType: string) => {
    return planType === "monthly" ? "月額" : "年額";
  };

  const getOriginalAmountDisplay = (sub: Subscription) => {
    if (sub.currency === "USD") {
      return `$${sub.amount.toLocaleString()}`;
    }
    return null;
  };

  return (
    <div className={styles.page}>
      <Header title="サブスク管理" />

      {/* サマリー */}
      <section className={styles.summarySection}>
        {isLoadingRate ? (
          <div className={styles.skeletonSummary}>
            <div className={styles.skeletonGrid}>
              <div className={`${styles.skeletonItem} skeleton`} />
              <div className={`${styles.skeletonItem} skeleton`} />
            </div>
          </div>
        ) : (
          <div className={styles.summaryCard}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>月額合計</div>
                <div className={`${styles.summaryValue} ${styles.highlight}`}>
                  {formatCurrency(monthlyTotal)}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>年額合計</div>
                <div className={styles.summaryValue}>
                  {formatCurrency(yearlyTotal)}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* リスト */}
      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>登録中のサブスク</h2>
          <span className={styles.listCount}>{subscriptions.length}件</span>
        </div>

        {subscriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💳</div>
            <h3 className={styles.emptyTitle}>サブスクがありません</h3>
            <p className={styles.emptyDescription}>
              右下の「+」ボタンから
              <br />
              サブスクを登録しましょう
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {subscriptions.map((sub) => (
              <div key={sub.id} className={styles.card}>
                <div className={styles.cardMain}>
                  <div className={styles.cardName}>{sub.name}</div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardPlanType}>
                      {getPlanTypeLabel(sub.planType)}
                    </span>
                    <span className={styles.cardAmount}>
                      {getOriginalAmountDisplay(sub) && (
                        <span>{getOriginalAmountDisplay(sub)} → </span>
                      )}
                      <span className={styles.cardAmountJpy}>
                        {formatCurrency(getAmountInJpy(sub))}
                      </span>
                    </span>
                  </div>
                </div>

                <div className={styles.cardMenu} ref={menuRef}>
                  <button
                    className={styles.menuButton}
                    onClick={() =>
                      setOpenMenuId(openMenuId === sub.id ? null : sub.id)
                    }
                    aria-label="メニューを開く"
                  >
                    ⋮
                  </button>

                  {openMenuId === sub.id && (
                    <div className={styles.menuDropdown}>
                      <button
                        className={styles.menuItem}
                        onClick={() => handleOpenModal(sub)}
                      >
                        ✏️ 編集
                      </button>
                      <button
                        className={`${styles.menuItem} ${styles.danger}`}
                        onClick={() => handleDelete(sub)}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <button
        className={styles.fab}
        onClick={() => handleOpenModal()}
        aria-label="新規登録"
      >
        +
      </button>

      {/* 登録/編集モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSubscription ? "サブスクを編集" : "サブスクを登録"}
      >
        <SubscriptionForm
          subscription={editingSubscription}
          onClose={handleCloseModal}
        />
      </Modal>

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="削除しますか？"
        message={`「${deleteTarget?.name}」を削除します。この操作は取り消せません。`}
      />
    </div>
  );
}
