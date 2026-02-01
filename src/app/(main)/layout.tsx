"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiHome } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { ToastContainer } from "@/components/Toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, userProfile, acknowledgeShareRevoked } = useAuth();

  // 未認証の場合はログインページへリダイレクト
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // 共有解除を確認
  const handleAcknowledgeRevoked = async () => {
    await acknowledgeShareRevoked();
  };

  // ローディング中
  if (isLoading) {
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}><HiHome /></div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  // 未認証（リダイレクト待ち）
  if (!isAuthenticated) {
    return null;
  }

  // メイン画面
  return (
    <div className="app-layout">
      <main className="main-content">{children}</main>
      <Navigation />
      <ToastContainer />

      {/* 共有解除通知モーダル（すでに親に昇格済み、OKボタン以外操作不可） */}
      {userProfile?.wasPromotedFromChild && (
        <div className="alert-modal-overlay">
          <div className="alert-modal-content">
            <div className="alert-modal-icon">⚠️</div>
            <h2 className="alert-modal-title">共有が解除されました</h2>
            <p className="alert-modal-message">
              オーナーによって共有が解除されました。<br />
              新しいデータベースが作成されました。
            </p>
            <button
              className="alert-modal-button"
              onClick={handleAcknowledgeRevoked}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
