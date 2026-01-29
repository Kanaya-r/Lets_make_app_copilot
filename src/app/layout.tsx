import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/contexts/AppContext";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  title: "いえログ - 家庭のあれこれを整理・把握",
  description: "サブスクリプション管理など、家庭のあれこれを整理・把握できるアプリ",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
