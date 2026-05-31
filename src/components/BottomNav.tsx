"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, SlidersHorizontal, BarChart2, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const ITEMS: NavItem[] = [
  { href: "/",          label: "ホーム",      Icon: Home              },
  { href: "/portfolio", label: "保有",        Icon: Briefcase         },
  { href: "/screener",  label: "スクリーナー", Icon: SlidersHorizontal },
  { href: "/sectors",   label: "セクター",    Icon: BarChart2         },
  { href: "/watchlist", label: "ウォッチ",    Icon: Star              },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Hairline separator */}
      <div className="h-px bg-zinc-200/80 dark:bg-white/[0.06]" />

      <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl flex items-stretch justify-around">
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
              {/* Icon */}
              <span
                className={`flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-150 ${
                  active
                    ? "bg-blue-50 dark:bg-blue-500/[0.12] text-blue-500 dark:text-blue-400"
                    : "text-zinc-400 dark:text-zinc-600"
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
                    ? "text-zinc-800 dark:text-zinc-100"
                    : "text-zinc-400 dark:text-zinc-600"
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
