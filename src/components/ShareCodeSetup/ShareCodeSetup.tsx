"use client";

import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { generateShareCode } from "@/lib/firestore";
import { APP_NAME } from "@/config/constants";
import styles from "./ShareCodeSetup.module.scss";

export function ShareCodeSetup() {
  const { setShareCodeAndLoad, isLoadingSubscriptions } = useApp();
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");

  const handleExistingCode = async () => {
    if (inputCode.length < 6) {
      setError("共有コードは6文字です");
      return;
    }

    setError("");
    const success = await setShareCodeAndLoad(inputCode.toUpperCase());
    if (!success) {
      setError("共有コードの読み込みに失敗しました");
    }
  };

  const handleNewCode = async () => {
    const newCode = generateShareCode();
    await setShareCodeAndLoad(newCode);
  };

  return (
    <div className={styles.container}>
      <div className={styles.logo}>🏠</div>
      <h1 className={styles.title}>{APP_NAME}</h1>
      <p className={styles.subtitle}>家庭のあれこれを整理・把握</p>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>はじめる</h2>
        <p className={styles.description}>
          新しく始める場合は「新規作成」を押してください。
          <br />
          別の端末と同期する場合は共有コードを入力してください。
        </p>

        <button
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={handleNewCode}
          disabled={isLoadingSubscriptions}
        >
          {isLoadingSubscriptions ? "作成中..." : "新規作成"}
        </button>

        <div className={styles.divider}>
          <span>または</span>
        </div>

        <div className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="共有コード"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={handleExistingCode}
          disabled={isLoadingSubscriptions || inputCode.length < 6}
        >
          {isLoadingSubscriptions ? "読み込み中..." : "コードで同期"}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
