"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiHome, HiCreditCard, HiCog } from "react-icons/hi";
import { navItems } from "@/config/genres";
import styles from "./Navigation.module.scss";

// アイコン名からコンポーネントへのマッピング
const iconMap: Record<string, React.ReactNode> = {
  home: <HiHome />,
  creditCard: <HiCreditCard />,
  settings: <HiCog />,
};

// 設定ナビアイテムを追加
const allNavItems = [
  ...navItems,
  { id: "settings", name: "設定", iconName: "settings", path: "/settings" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        {allNavItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(item.path));

          return (
            <li key={item.id} className={styles.navItem}>
              <Link
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
              >
                <span className={styles.navIcon}>{iconMap[item.iconName]}</span>
                <span className={styles.navLabel}>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
