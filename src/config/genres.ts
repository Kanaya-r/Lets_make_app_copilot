import { Genre } from "@/types";

// ジャンル定義（拡張しやすいように配列化）
export const genres: Genre[] = [
  {
    id: "subscriptions",
    name: "サブスク",
    iconName: "creditCard",
    path: "/subscriptions",
  },
  // 将来追加例:
  // {
  //   id: "appliances",
  //   name: "家電",
  //   iconName: "plug",
  //   path: "/appliances",
  // },
];

// ナビゲーション項目（TOP + ジャンル）
export const navItems = [
  {
    id: "top",
    name: "TOP",
    iconName: "home",
    path: "/",
  },
  ...genres,
];
