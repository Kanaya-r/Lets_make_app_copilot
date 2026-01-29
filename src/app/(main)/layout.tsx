"use client";

import { useApp } from "@/contexts/AppContext";
import { Navigation } from "@/components/Navigation";
import { ToastContainer } from "@/components/Toast";
import { ShareCodeSetup } from "@/components/ShareCodeSetup";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { shareCode, isLoadingShareCode } = useApp();

  // ローディング中
  if (isLoadingShareCode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  // 共有コード未設定
  if (!shareCode) {
    return (
      <>
        <ShareCodeSetup />
        <ToastContainer />
      </>
    );
  }

  // メイン画面
  return (
    <div className="app-layout">
      <main className="main-content">{children}</main>
      <Navigation />
      <ToastContainer />
    </div>
  );
}
