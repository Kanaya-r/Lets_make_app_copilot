"use client";

import { useApp } from "@/contexts/AppContext";
import { APP_NAME } from "@/config/constants";
import styles from "./Header.module.scss";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { shareCode, showToast } = useApp();

  const handleCopyCode = async () => {
    if (!shareCode) return;
    try {
      await navigator.clipboard.writeText(shareCode);
      showToast("success", "共有コードをコピーしました");
    } catch {
      showToast("error", "コピーに失敗しました");
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.titleGroup}>
          <span className={styles.logo}>🏠</span>
          <h1 className={styles.title}>{title || APP_NAME}</h1>
        </div>
        {shareCode && (
          <div className={styles.shareCode}>
            <span>共有コード:</span>
            <span className={styles.codeValue}>{shareCode}</span>
            <button
              className={styles.copyButton}
              onClick={handleCopyCode}
              aria-label="共有コードをコピー"
            >
              📋
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
