"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiHome } from "react-icons/hi";
import { useAuth } from "@/contexts/AuthContext";
import { ToastContainer } from "@/components/Toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

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

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
