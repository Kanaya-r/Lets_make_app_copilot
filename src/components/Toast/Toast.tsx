"use client";

import { HiCheck, HiX, HiInformationCircle } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Toast.module.scss";

export function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <HiCheck />;
      case "error":
        return <HiX />;
      case "info":
        return <HiInformationCircle />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <span className={styles.icon}>{getIcon(toast.type)}</span>
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.closeButton}
            onClick={() => removeToast(toast.id)}
            aria-label="閉じる"
          >
            <HiX />
          </button>
        </div>
      ))}
    </div>
  );
}
