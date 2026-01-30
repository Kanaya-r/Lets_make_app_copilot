"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏠</div>
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

      {/* 共有解除通知モーダル */}
      {userProfile?.isShareRevoked && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ textAlign: "center", padding: "16px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
              <h2>共有が解除されました</h2>
              <p style={{ color: "#666", marginTop: "8px" }}>
                オーナーによって共有が解除されました。新しいデータベースが作成されます。
              </p>
              <button
                onClick={handleAcknowledgeRevoked}
                style={{
                  marginTop: "24px",
                  padding: "12px 32px",
                  backgroundColor: "#3B82F6",
                  color: "white",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
