"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, SlidersHorizontal, BarChart2, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  activeFg: string;
  activeBg: string;
};

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    Icon: Home,
    activeFg: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-100 dark:bg-violet-900/40",
  },
  {
    href: "/portfolio",
    label: "保有",
    Icon: Briefcase,
    activeFg: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  {
    href: "/screener",
    label: "スクリーナー",
    Icon: SlidersHorizontal,
    activeFg: "text-orange-600 dark:text-orange-400",
    activeBg: "bg-orange-100 dark:bg-orange-900/40",
  },
  {
    href: "/sectors",
    label: "セクター",
    Icon: BarChart2,
    activeFg: "text-blue-600 dark:text-blue-400",
    activeBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    href: "/watchlist",
    label: "ウォッチ",
    Icon: Star,
    activeFg: "text-pink-600 dark:text-pink-400",
    activeBg: "bg-pink-100 dark:bg-pink-900/40",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Top hairline */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/80 dark:via-slate-700/50 to-transparent" />

      <div className="bg-white/96 dark:bg-slate-900/96 backdrop-blur-2xl flex items-stretch justify-around">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all active:scale-90"
              style={{ minHeight: 56 }}
            >
              {/* Icon container */}
              <span
                className={`flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-150 ${
                  active ? `${item.activeBg} ${item.activeFg}` : "text-slate-400 dark:text-slate-600"
                }`}
              >
                <item.Icon
                  className="w-[19px] h-[19px]"
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </span>

              {/* Label */}
              <span
                className={`text-[9px] font-semibold tracking-wide leading-none transition-colors whitespace-nowrap ${
                  active
                    ? "text-slate-800 dark:text-slate-100"
                    : "text-slate-400 dark:text-slate-600"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
