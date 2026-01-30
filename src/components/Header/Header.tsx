"use client";

import { APP_NAME } from "@/config/constants";
import styles from "./Header.module.scss";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.titleGroup}>
          <span className={styles.logo}>🏠</span>
          <h1 className={styles.title}>{title || APP_NAME}</h1>
        </div>
      </div>
    </header>
  );
}
