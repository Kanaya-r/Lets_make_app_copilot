"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/config/genres";
import styles from "./Navigation.module.scss";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(item.path));

          return (
            <li key={item.id} className={styles.navItem}>
              <Link
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
