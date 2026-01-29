import { Genre } from "@/types";

// ジャンル定義（拡張しやすいように配列化）
export const genres: Genre[] = [
  {
    id: "subscriptions",
    name: "サブスク",
    icon: "💳",
    path: "/subscriptions",
  },
  // 将来追加例:
  // {
  //   id: "appliances",
  //   name: "家電",
  //   icon: "🔌",
  //   path: "/appliances",
  // },
];

// ナビゲーション項目（TOP + ジャンル）
export const navItems = [
  {
    id: "top",
    name: "TOP",
    icon: "🏠",
    path: "/",
  },
  ...genres,
];
